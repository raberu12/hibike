const DEFAULT_SAMPLE_RATE = 44100
const PLUCK_DURATION_SECONDS = 2
const PLUCK_FREQUENCY = 440
const WAV_HEADER_BYTES = 44
const PCM_BYTES_PER_SAMPLE = 2

export function encodeWav(samples: Float32Array, sampleRate: number) {
  const dataSize = samples.length * PCM_BYTES_PER_SAMPLE
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataSize)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * PCM_BYTES_PER_SAMPLE, true)
  view.setUint16(32, PCM_BYTES_PER_SAMPLE, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = WAV_HEADER_BYTES

  for (const sample of samples) {
    const clampedSample = Math.max(-1, Math.min(1, sample))
    const pcmSample = clampedSample < 0
      ? clampedSample * 0x8000
      : clampedSample * 0x7fff

    view.setInt16(offset, pcmSample, true)
    offset += PCM_BYTES_PER_SAMPLE
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function generateUkulelePluckWav(sampleRate = DEFAULT_SAMPLE_RATE) {
  const sampleCount = Math.floor(sampleRate * PLUCK_DURATION_SECONDS)
  const samples = new Float32Array(sampleCount)
  const harmonics = [
    { multiplier: 1, gain: 0.78, decay: 4.8 },
    { multiplier: 2, gain: 0.28, decay: 6.4 },
    { multiplier: 3, gain: 0.14, decay: 7.5 },
    { multiplier: 4, gain: 0.08, decay: 9.5 },
  ]

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate
    const attack = Math.min(1, time / 0.012)
    const body = harmonics.reduce((sum, harmonic) => {
      const amplitude = harmonic.gain * Math.exp(-time * harmonic.decay)
      const angle = 2 * Math.PI * PLUCK_FREQUENCY * harmonic.multiplier * time

      return sum + Math.sin(angle) * amplitude
    }, 0)
    const softNoise = deterministicNoise(index) * 0.018 * Math.exp(-time * 18)

    samples[index] = (body + softNoise) * attack * 0.72
  }

  return encodeWav(samples, sampleRate)
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}

function deterministicNoise(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453

  return (value - Math.floor(value)) * 2 - 1
}
