import { useCallback, useEffect, useRef, useState } from 'react'
import { detectPitch } from '../utils/pitchDetection'

export type AudioState = {
  frequency: number | null
  isListening: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

const FFT_SIZE = 2048
const SMOOTHING_WINDOW = 5

export function useAudio(): AudioState {
  const [frequency, setFrequency] = useState<number | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recentFrequenciesRef = useRef<number[]>([])

  const stop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    void audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
    recentFrequenciesRef.current = []
    setIsListening(false)
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
    if (isListening) {
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

      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.2
      source.connect(analyser)

      streamRef.current = stream
      audioContextRef.current = audioContext
      analyserRef.current = analyser
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
  }, [isListening, processAudio, stop])

  useEffect(() => stop, [stop])

  return { frequency, isListening, error, start, stop }
}
