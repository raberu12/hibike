export type PitchDetectionResult = {
  frequency: number
  clarity: number
}

const MIN_RMS = 0.01
const MIN_CLARITY = 0.55

// Standard ukulele strings are C4-A4. Keep a little margin for out-of-tune
// strings while rejecting common low-frequency subharmonic locks around 100 Hz.
const MIN_FREQUENCY = 220
const MAX_FREQUENCY = 520

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

  // Convert the target frequency range into lag bounds because autocorrelation
  // detects pitch by finding the repeating period in the time-domain signal.
  const minLag = Math.floor(sampleRate / MAX_FREQUENCY)
  const maxLag = Math.min(
    Math.floor(sampleRate / MIN_FREQUENCY),
    samples.length - 1,
  )
  const correlations = getNormalizedCorrelations(samples, minLag, maxLag)
  const bestLag = findFirstStrongPeak(correlations, minLag)

  if (bestLag === null) {
    return null
  }

  const refinedLag = refineLagWithParabolicInterpolation(correlations, bestLag)
  const frequency = sampleRate / refinedLag
  const clarity = correlations[bestLag] ?? 0

  if (
    !Number.isFinite(frequency) ||
    frequency < MIN_FREQUENCY ||
    frequency > MAX_FREQUENCY ||
    clarity < MIN_CLARITY
  ) {
    return null
  }

  return { frequency, clarity }
}

function getNormalizedCorrelations(
  samples: Float32Array,
  minLag: number,
  maxLag: number,
) {
  const correlations = new Float32Array(maxLag + 1)

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let offsetDifference = 0
    let signalPower = 0

    for (let index = 0; index < samples.length - lag; index += 1) {
      const current = samples[index]
      const shifted = samples[index + lag]
      const difference = current - shifted

      offsetDifference += difference * difference
      signalPower += current * current + shifted * shifted
    }

    // A value near 1 means the waveform aligns well with a shifted copy of
    // itself, which is the signature of a repeating period.
    correlations[lag] = signalPower > 0 ? 1 - offsetDifference / signalPower : 0
  }

  return correlations
}

function findFirstStrongPeak(correlations: Float32Array, minLag: number) {
  let bestLag = -1
  let bestCorrelation = 0

  for (let lag = minLag + 1; lag < correlations.length - 1; lag += 1) {
    const isPeak =
      correlations[lag] > correlations[lag - 1] &&
      correlations[lag] >= correlations[lag + 1]

    if (!isPeak) {
      continue
    }

    if (correlations[lag] > bestCorrelation) {
      bestCorrelation = correlations[lag]
      bestLag = lag
    }

    // The first clear peak is usually the true fundamental. Taking the largest
    // peak can choose a lower octave/subharmonic for clean generated tones.
    if (correlations[lag] >= MIN_CLARITY) {
      return lag
    }
  }

  return bestLag === -1 ? null : bestLag
}

function refineLagWithParabolicInterpolation(
  correlations: Float32Array,
  lag: number,
) {
  const previous = correlations[lag - 1] ?? 0
  const current = correlations[lag] ?? 0
  const next = correlations[lag + 1] ?? 0
  const denominator = previous - 2 * current + next

  if (Math.abs(denominator) < Number.EPSILON) {
    return lag
  }

  // Interpolating around the discrete peak gives a sub-sample lag estimate,
  // which improves frequency accuracy beyond the analyser buffer resolution.
  const offset = 0.5 * (previous - next) / denominator
  return lag + Math.max(-0.5, Math.min(0.5, offset))
}
