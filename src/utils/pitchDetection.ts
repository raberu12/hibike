import { Macleod } from 'pitchfinder'

export type PitchDetectionResult = {
  frequency: number
}

const MIN_RMS = 0.01
const MACLEOD_CUTOFF = 0.97
const MACLEOD_PROBABILITY_THRESHOLD = 0.55

// Standard ukulele strings are C4-A4. Keep a little margin for out-of-tune
// strings while rejecting common low-frequency subharmonic locks around 100 Hz.
const MIN_FREQUENCY = 220
const MAX_FREQUENCY = 520
const detectorCache = new Map<
  number,
  (samples: Float32Array) => { freq: number; probability: number }
>()

function getRms(samples: Float32Array) {
  let sum = 0

  for (const sample of samples) {
    sum += sample * sample
  }

  return Math.sqrt(sum / samples.length)
}

export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
): PitchDetectionResult | null {
  const rms = getRms(samples)

  // Ignore frames with too little energy because autocorrelation becomes noisy
  // and unstable when the input is close to silence.
  if (rms < MIN_RMS) {
    return null
  }

  const detector = getMacleodDetector(sampleRate, samples.length)
  const result = detector(samples)
  const frequency = result.freq

  if (
    !Number.isFinite(result.probability) ||
    result.probability < MACLEOD_PROBABILITY_THRESHOLD ||
    !Number.isFinite(frequency) ||
    frequency < MIN_FREQUENCY ||
    frequency > MAX_FREQUENCY
  ) {
    return null
  }

  return { frequency }
}

function getMacleodDetector(sampleRate: number, bufferSize: number) {
  const cacheKey = sampleRate * 100000 + bufferSize
  const cached = detectorCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const detector = Macleod({
    sampleRate,
    bufferSize,
    cutoff: MACLEOD_CUTOFF,
  })

  detectorCache.set(cacheKey, detector)
  return detector
}
