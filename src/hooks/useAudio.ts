import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_EFFECT_SETTINGS,
  EFFECT_PRESETS,
  type EffectPresetId,
  type EffectSettings,
} from '../utils/effects'
import { detectPitch } from '../utils/pitchDetection'

export type AudioState = {
  frequency: number | null
  isListening: boolean
  isMonitoring: boolean
  error: string | null
  effectSettings: EffectSettings
  selectedPresetId: EffectPresetId | null
  presets: typeof EFFECT_PRESETS
  start: () => Promise<void>
  stop: () => void
  enableMonitoring: () => Promise<void>
  disableMonitoring: () => void
  applyEffectPreset: (presetId: EffectPresetId) => void
  setEffectSetting: (key: keyof EffectSettings, value: number) => void
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

export function useAudio(): AudioState {
  const [frequency, setFrequency] = useState<number | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [effectSettings, setEffectSettings] = useState<EffectSettings>(
    DEFAULT_EFFECT_SETTINGS,
  )
  const [selectedPresetId, setSelectedPresetId] =
    useState<EffectPresetId | null>(DEFAULT_PRESET_ID)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const effectGraphRef = useRef<EffectGraph | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recentFrequenciesRef = useRef<number[]>([])
  const settingsRef = useRef(effectSettings)

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

  const stop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    effectGraphRef.current = null

    void audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
    recentFrequenciesRef.current = []
    setIsListening(false)
    setIsMonitoring(false)
    setFrequency(null)
  }, [])

  const processAudio = useCallback(function processAudioLoop() {
    const analyser = analyserRef.current
    const audioContext = audioContextRef.current

    if (!analyser || !audioContext) {
      return
    }

    const samples = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(samples)

    const result = detectPitch(samples, audioContext.sampleRate)

    if (result) {
      const recent = [...recentFrequenciesRef.current, result.frequency].slice(
        -SMOOTHING_WINDOW,
      )
      recentFrequenciesRef.current = recent
      const average = recent.reduce((sum, value) => sum + value, 0) / recent.length
      setFrequency(average)
    } else if (recentFrequenciesRef.current.length === 0) {
      setFrequency(null)
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

      source.connect(analyser)
      connectEffectGraph(source, effectGraph)
      applySettingsToGraph(settingsRef.current, audioContext)

      streamRef.current = stream
      audioContextRef.current = audioContext
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
    setIsMonitoring(true)
  }, [start])

  const setEffectSetting = useCallback(
    (key: keyof EffectSettings, value: number) => {
      const safeValue = clamp01(value)

      setSelectedPresetId(null)
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
      setEffectSettings(nextSettings)
      applySettingsToGraph(nextSettings)
    },
    [applySettingsToGraph],
  )

  useEffect(() => stop, [stop])

  return {
    frequency,
    isListening,
    isMonitoring,
    error,
    effectSettings,
    selectedPresetId,
    presets: EFFECT_PRESETS,
    start,
    stop,
    enableMonitoring,
    disableMonitoring,
    applyEffectPreset,
    setEffectSetting,
  }
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
