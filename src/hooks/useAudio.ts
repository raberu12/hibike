import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_EFFECT_SETTINGS,
  EFFECT_PRESETS,
  type EffectPresetId,
  type EffectSettings,
} from '../utils/effects'
import {
  getAutoDetectedUkuleleNote,
  getUkuleleNoteMatch,
  type NoteMatch,
  type UkuleleNoteName,
} from '../utils/noteMapping'
import { detectPitch } from '../utils/pitchDetection'
import { renderEffectedWav } from '../utils/offlineEffects'
import { encodeWav } from '../utils/wav'

export type AudioState = {
  frequency: number | null
  match: NoteMatch | null
  isListening: boolean
  isMonitoring: boolean
  hasLiveFilteringSession: boolean
  error: string | null
  effectSettings: EffectSettings
  selectedPresetId: EffectPresetId | null
  presets: typeof EFFECT_PRESETS
  isRecording: boolean
  recordingBlob: Blob | null
  processedRecordingBlob: Blob | null
  isProcessingRecording: boolean
  start: () => Promise<void>
  stop: () => void
  enableMonitoring: () => Promise<void>
  disableMonitoring: () => void
  applyEffectPreset: (presetId: EffectPresetId) => void
  selectCustomPreset: () => void
  setEffectSetting: (key: keyof EffectSettings, value: number) => void
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearRecording: () => void
  processRecordingWithEffects: () => Promise<void>
}

type EffectGraph = {
  inputGain: GainNode
  compressor: DynamicsCompressorNode
  drive: WaveShaperNode
  tone: BiquadFilterNode
  delay: DelayNode
  delayGain: GainNode
  convolver: ConvolverNode
  reverbGain: GainNode
  outputGain: GainNode
  monitorGain: GainNode
}

const FFT_SIZE = 2048
const SMOOTHING_WINDOW = 5
const DEFAULT_PRESET_ID: EffectPresetId = 'clean'
const RECORDING_MAX_SECONDS = 20
const RECORDER_BUFFER_SIZE = 4096
const LOST_PITCH_RELEASE_MS = 150

export type TunerTarget = UkuleleNoteName | 'auto'

export function useAudio(targetNote: TunerTarget): AudioState {
  const [frequency, setFrequency] = useState<number | null>(null)
  const [match, setMatch] = useState<NoteMatch | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [hasLiveFilteringSession, setHasLiveFilteringSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [effectSettings, setEffectSettings] = useState<EffectSettings>(
    DEFAULT_EFFECT_SETTINGS,
  )
  const [selectedPresetId, setSelectedPresetId] =
    useState<EffectPresetId | null>(DEFAULT_PRESET_ID)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
  const [processedRecordingBlob, setProcessedRecordingBlob] = useState<Blob | null>(null)
  const [isProcessingRecording, setIsProcessingRecording] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const effectGraphRef = useRef<EffectGraph | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recentFrequenciesRef = useRef<number[]>([])
  const lostPitchStartedAtRef = useRef<number | null>(null)
  const recordingChunksRef = useRef<Float32Array[]>([])
  const recordedSamplesRef = useRef<Float32Array | null>(null)
  const recordingSampleRateRef = useRef(44100)
  const recorderNodeRef = useRef<ScriptProcessorNode | null>(null)
  const recorderSilentGainRef = useRef<GainNode | null>(null)
  const recordingTimeoutRef = useRef<number | null>(null)
  const settingsRef = useRef(effectSettings)
  const targetNoteRef = useRef(targetNote)

  useEffect(() => {
    targetNoteRef.current = targetNote

    if (frequency !== null) {
      setMatch(getTunerMatch(frequency, targetNote))
    } else {
      setMatch(null)
    }
  }, [frequency, targetNote])

  const applySettingsToGraph = useCallback(
    (settings: EffectSettings, audioContext = audioContextRef.current) => {
      const graph = effectGraphRef.current

      if (!graph || !audioContext) {
        return
      }

      graph.drive.curve = createOverdriveCurve(settings.drive)
      graph.drive.oversample = '4x'
      graph.tone.frequency.setTargetAtTime(
        mapRange(settings.tone, 700, 6500),
        audioContext.currentTime,
        0.01,
      )
      graph.tone.Q.setTargetAtTime(0.7 + settings.tone * 1.6, audioContext.currentTime, 0.01)
      graph.delay.delayTime.setTargetAtTime(
        mapRange(settings.delay, 0.08, 0.42),
        audioContext.currentTime,
        0.01,
      )
      graph.delayGain.gain.setTargetAtTime(settings.delay * 0.42, audioContext.currentTime, 0.01)
      graph.reverbGain.gain.setTargetAtTime(settings.reverb * 0.55, audioContext.currentTime, 0.01)
      graph.outputGain.gain.setTargetAtTime(settings.volume, audioContext.currentTime, 0.01)
    },
    [],
  )

  const disableMonitoring = useCallback(() => {
    const audioContext = audioContextRef.current
    const graph = effectGraphRef.current

    if (audioContext && graph) {
      graph.monitorGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.02)
    }

    setIsMonitoring(false)
  }, [])


  const stopRecording = useCallback(() => {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }

    const recorderNode = recorderNodeRef.current

    if (recorderNode) {
      recorderNode.onaudioprocess = null
      safeDisconnect(recorderNode)
    }

    safeDisconnect(recorderSilentGainRef.current)
    recorderNodeRef.current = null
    recorderSilentGainRef.current = null

    const chunks = recordingChunksRef.current
    recordingChunksRef.current = []
    setIsRecording(false)

    if (chunks.length === 0) {
      return
    }

    const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0)
    const samples = new Float32Array(sampleCount)
    let offset = 0

    for (const chunk of chunks) {
      samples.set(chunk, offset)
      offset += chunk.length
    }

    recordedSamplesRef.current = samples
    setProcessedRecordingBlob(null)
    setRecordingBlob(encodeWav(samples, recordingSampleRateRef.current))
  }, [])

  const clearRecording = useCallback(() => {
    if (recorderNodeRef.current) {
      stopRecording()
    }

    recordingChunksRef.current = []
    recordedSamplesRef.current = null
    setProcessedRecordingBlob(null)
    setRecordingBlob(null)
  }, [stopRecording])

  const stop = useCallback(() => {
    stopRecording()

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    sourceRef.current = null
    effectGraphRef.current = null

    void audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
    recentFrequenciesRef.current = []
    lostPitchStartedAtRef.current = null
    setIsListening(false)
    setIsMonitoring(false)
    setHasLiveFilteringSession(false)
    setFrequency(null)
    setMatch(null)
  }, [stopRecording])

  const processAudio = useCallback(function processAudioLoop() {
    const analyser = analyserRef.current
    const audioContext = audioContextRef.current

    if (!analyser || !audioContext) {
      return
    }

    const samples = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(samples)

    // The tuner works in the time domain: each animation frame reads a short
    // microphone window, estimates its fundamental frequency, and updates the UI.
    const result = detectPitch(samples, audioContext.sampleRate)
    const now = performance.now()

    if (result) {
      // Average a few consecutive pitch estimates so the meter reflects the
      // player's note rather than frame-to-frame jitter from the raw detector.
      const recent = [...recentFrequenciesRef.current, result.frequency].slice(
        -SMOOTHING_WINDOW,
      )
      recentFrequenciesRef.current = recent
      lostPitchStartedAtRef.current = null
      const average = recent.reduce((sum, value) => sum + value, 0) / recent.length
      setFrequency(average)
      setMatch(getTunerMatch(average, targetNoteRef.current))
    } else {
      if (lostPitchStartedAtRef.current === null) {
        lostPitchStartedAtRef.current = now
      }

      if (now - lostPitchStartedAtRef.current >= LOST_PITCH_RELEASE_MS) {
        recentFrequenciesRef.current = []
        setFrequency(null)
        setMatch(null)
      }
    }

    animationFrameRef.current = requestAnimationFrame(processAudioLoop)
  }, [])

  const start = useCallback(async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    if (streamRef.current) {
      setIsListening(true)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access is not available in this browser.')
      return
    }

    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Disable browser voice-processing features so pitch detection sees a
          // cleaner, less colorized instrument signal.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      const effectGraph = createEffectGraph(audioContext)

      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.2

      // Split the live mic stream into two paths: analysis for tuning feedback
      // and an effect chain for optional monitoring/recording.
      source.connect(analyser)
      connectEffectGraph(source, effectGraph)
      applySettingsToGraph(settingsRef.current, audioContext)

      streamRef.current = stream
      audioContextRef.current = audioContext
      sourceRef.current = source
      analyserRef.current = analyser
      effectGraphRef.current = effectGraph
      setIsListening(true)
      animationFrameRef.current = requestAnimationFrame(processAudio)
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to access microphone input.'
      setError(message)
      stop()
    }
  }, [applySettingsToGraph, processAudio, stop])

  const enableMonitoring = useCallback(async () => {
    await start()

    const audioContext = audioContextRef.current
    const graph = effectGraphRef.current

    if (!audioContext || !graph) {
      return
    }

    graph.monitorGain.gain.setTargetAtTime(1, audioContext.currentTime, 0.02)
    setHasLiveFilteringSession(true)
    setIsMonitoring(true)
  }, [start])


  const startRecording = useCallback(async () => {
    if (recorderNodeRef.current) {
      return
    }

    await start()

    const audioContext = audioContextRef.current
    const source = sourceRef.current

    if (!audioContext || !source) {
      return
    }

    const recorderNode = audioContext.createScriptProcessor(RECORDER_BUFFER_SIZE, 1, 1)
    const silentGain = audioContext.createGain()

    silentGain.gain.value = 0
    recordingChunksRef.current = []
    recordedSamplesRef.current = null
    recordingSampleRateRef.current = audioContext.sampleRate
    setProcessedRecordingBlob(null)
    setRecordingBlob(null)

    recorderNode.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0)
      // Copy each buffer because Web Audio reuses its internal memory between
      // callbacks; keeping our own snapshots preserves the full recording.
      recordingChunksRef.current.push(new Float32Array(input))
    }

    source.connect(recorderNode)
    recorderNode.connect(silentGain)
    silentGain.connect(audioContext.destination)

    recorderNodeRef.current = recorderNode
    recorderSilentGainRef.current = silentGain
    setIsRecording(true)
    recordingTimeoutRef.current = window.setTimeout(
      stopRecording,
      RECORDING_MAX_SECONDS * 1000,
    )
  }, [start, stopRecording])


  const processRecordingWithEffects = useCallback(async () => {
    const recordedSamples = recordedSamplesRef.current

    if (!recordedSamples || isProcessingRecording) {
      return
    }

    try {
      setIsProcessingRecording(true)
      const processedBlob = await renderEffectedWav(
        recordedSamples,
        recordingSampleRateRef.current,
        settingsRef.current,
      )
      setProcessedRecordingBlob(processedBlob)
    } finally {
      setIsProcessingRecording(false)
    }
  }, [isProcessingRecording])

  const setEffectSetting = useCallback(
    (key: keyof EffectSettings, value: number) => {
      const safeValue = clamp01(value)

      setSelectedPresetId(null)
      setProcessedRecordingBlob(null)
      setEffectSettings((currentSettings) => {
        const nextSettings = { ...currentSettings, [key]: safeValue }
        settingsRef.current = nextSettings
        applySettingsToGraph(nextSettings)
        return nextSettings
      })
    },
    [applySettingsToGraph],
  )

  const applyEffectPreset = useCallback(
    (presetId: EffectPresetId) => {
      const preset = EFFECT_PRESETS.find((candidate) => candidate.id === presetId)

      if (!preset) {
        return
      }

      const nextSettings = { ...preset.settings }
      settingsRef.current = nextSettings
      setSelectedPresetId(preset.id)
      setProcessedRecordingBlob(null)
      setEffectSettings(nextSettings)
      applySettingsToGraph(nextSettings)
    },
    [applySettingsToGraph],
  )

  const selectCustomPreset = useCallback(() => {
    setSelectedPresetId(null)
  }, [])

  useEffect(() => stop, [stop])

  return {
    frequency,
    match,
    isListening,
    isMonitoring,
    hasLiveFilteringSession,
    error,
    effectSettings,
    selectedPresetId,
    presets: EFFECT_PRESETS,
    isRecording,
    recordingBlob,
    processedRecordingBlob,
    isProcessingRecording,
    start,
    stop,
    enableMonitoring,
    disableMonitoring,
    applyEffectPreset,
    selectCustomPreset,
    setEffectSetting,
    startRecording,
    stopRecording,
    clearRecording,
    processRecordingWithEffects,
  }
}

function getTunerMatch(frequency: number, targetNote: TunerTarget) {
  if (targetNote === 'auto') {
    return getAutoDetectedUkuleleNote(frequency)
  }

  return getUkuleleNoteMatch(frequency, targetNote)
}

function createEffectGraph(audioContext: AudioContext): EffectGraph {
  const inputGain = audioContext.createGain()
  const compressor = audioContext.createDynamicsCompressor()
  const drive = audioContext.createWaveShaper()
  const tone = audioContext.createBiquadFilter()
  const delay = audioContext.createDelay(1)
  const delayGain = audioContext.createGain()
  const convolver = audioContext.createConvolver()
  const reverbGain = audioContext.createGain()
  const outputGain = audioContext.createGain()
  const monitorGain = audioContext.createGain()

  inputGain.gain.value = 1
  compressor.threshold.value = -28
  compressor.knee.value = 24
  compressor.ratio.value = 4
  compressor.attack.value = 0.008
  compressor.release.value = 0.18
  tone.type = 'lowpass'
  convolver.buffer = createImpulseResponse(audioContext)
  monitorGain.gain.value = 0

  // This graph models a simple pedalboard: compression -> drive -> tone, then
  // parallel delay and reverb paths mixed back into the monitored output.
  inputGain.connect(compressor)
  compressor.connect(drive)
  drive.connect(tone)
  tone.connect(outputGain)
  tone.connect(delay)
  delay.connect(delayGain)
  delayGain.connect(outputGain)
  tone.connect(convolver)
  convolver.connect(reverbGain)
  reverbGain.connect(outputGain)
  outputGain.connect(monitorGain)
  monitorGain.connect(audioContext.destination)

  return {
    inputGain,
    compressor,
    drive,
    tone,
    delay,
    delayGain,
    convolver,
    reverbGain,
    outputGain,
    monitorGain,
  }
}

function connectEffectGraph(
  source: MediaStreamAudioSourceNode,
  effectGraph: EffectGraph,
) {
  source.connect(effectGraph.inputGain)
}

function createOverdriveCurve(drive: number) {
  const sampleCount = 44100
  const curve = new Float32Array(sampleCount)
  const amount = 1 + drive * 80

  for (let index = 0; index < sampleCount; index += 1) {
    const x = (index * 2) / sampleCount - 1
    curve[index] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x))
  }

  return curve
}

function createImpulseResponse(audioContext: AudioContext) {
  const duration = 1.6
  const length = Math.floor(audioContext.sampleRate * duration)
  const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate)

  // Reverb is synthesized by feeding decaying noise into a convolver, which
  // approximates many tiny reflections in a room.
  for (let channelIndex = 0; channelIndex < impulse.numberOfChannels; channelIndex += 1) {
    const channel = impulse.getChannelData(channelIndex)

    for (let index = 0; index < length; index += 1) {
      const decay = (1 - index / length) ** 2.2
      channel[index] = (Math.random() * 2 - 1) * decay
    }
  }

  return impulse
}

function mapRange(value: number, min: number, max: number) {
  return min + clamp01(value) * (max - min)
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(1, value))
}


function safeDisconnect(node: AudioNode | null) {
  try {
    node?.disconnect()
  } catch {
    // Node may already be disconnected during cleanup.
  }
}
