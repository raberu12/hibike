import type { EffectSettings } from './effects'
import { encodeWav } from './wav'

const EFFECT_TAIL_SECONDS = 1.5

export async function renderEffectedWav(
  samples: Float32Array,
  sampleRate: number,
  settings: EffectSettings,
) {
  // Leave extra render time so delay and reverb tails are included instead of
  // being cut off at the end of the dry recording.
  const renderLength = samples.length + Math.floor(sampleRate * EFFECT_TAIL_SECONDS)
  const audioContext = new OfflineAudioContext(1, renderLength, sampleRate)
  const sourceBuffer = audioContext.createBuffer(1, renderLength, sampleRate)

  sourceBuffer.getChannelData(0).set(samples)

  const source = audioContext.createBufferSource()
  const compressor = audioContext.createDynamicsCompressor()
  const drive = audioContext.createWaveShaper()
  const tone = audioContext.createBiquadFilter()
  const delay = audioContext.createDelay(1)
  const delayGain = audioContext.createGain()
  const convolver = audioContext.createConvolver()
  const reverbGain = audioContext.createGain()
  const outputGain = audioContext.createGain()

  source.buffer = sourceBuffer
  compressor.threshold.value = -28
  compressor.knee.value = 24
  compressor.ratio.value = 4
  compressor.attack.value = 0.008
  compressor.release.value = 0.18
  drive.curve = createOverdriveCurve(settings.drive)
  drive.oversample = '4x'
  tone.type = 'lowpass'
  tone.frequency.value = mapRange(settings.tone, 700, 6500)
  tone.Q.value = 0.7 + settings.tone * 1.6
  delay.delayTime.value = mapRange(settings.delay, 0.08, 0.42)
  delayGain.gain.value = settings.delay * 0.42
  convolver.buffer = createImpulseResponse(audioContext)
  reverbGain.gain.value = settings.reverb * 0.55
  outputGain.gain.value = settings.volume

  // Recreate the same signal path offline so exported audio matches the live
  // effect settings without depending on real-time playback.
  source.connect(compressor)
  compressor.connect(drive)
  drive.connect(tone)
  tone.connect(outputGain)
  tone.connect(delay)
  delay.connect(delayGain)
  delayGain.connect(outputGain)
  tone.connect(convolver)
  convolver.connect(reverbGain)
  reverbGain.connect(outputGain)
  outputGain.connect(audioContext.destination)

  source.start()

  const renderedBuffer = await audioContext.startRendering()
  const renderedSamples = renderedBuffer.getChannelData(0)

  return encodeWav(renderedSamples, sampleRate)
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

function createImpulseResponse(audioContext: BaseAudioContext) {
  const duration = 1.6
  const length = Math.floor(audioContext.sampleRate * duration)
  const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate)

  for (let channelIndex = 0; channelIndex < impulse.numberOfChannels; channelIndex += 1) {
    const channel = impulse.getChannelData(channelIndex)

    for (let index = 0; index < length; index += 1) {
      const decay = (1 - index / length) ** 2.2
      channel[index] = deterministicNoise(index + channelIndex * length) * decay
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

function deterministicNoise(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453

  return (value - Math.floor(value)) * 2 - 1
}
