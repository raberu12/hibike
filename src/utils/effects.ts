export type EffectPresetId = 'clean' | 'warm' | 'electric' | 'spacey' | 'crunch'

export type EffectSettings = {
  drive: number
  tone: number
  reverb: number
  delay: number
  volume: number
}

export type EffectPreset = {
  id: EffectPresetId
  name: string
  description: string
  settings: EffectSettings
}

export const EFFECT_PRESETS: EffectPreset[] = [
  {
    id: 'clean',
    name: 'Clean',
    description: 'Natural uke with light compression.',
    settings: { drive: 0, tone: 0.62, reverb: 0.12, delay: 0, volume: 0.55 },
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Soft body, darker tone, small room.',
    settings: { drive: 0.18, tone: 0.38, reverb: 0.24, delay: 0.04, volume: 0.55 },
  },
  {
    id: 'electric',
    name: 'Electric',
    description: 'Bright overdrive for a plugged-in sound.',
    settings: { drive: 0.58, tone: 0.72, reverb: 0.18, delay: 0.08, volume: 0.5 },
  },
  {
    id: 'spacey',
    name: 'Spacey',
    description: 'Wide ambience with echo and reverb.',
    settings: { drive: 0.12, tone: 0.64, reverb: 0.58, delay: 0.46, volume: 0.48 },
  },
  {
    id: 'crunch',
    name: 'Crunch',
    description: 'Stronger grit with a tighter room.',
    settings: { drive: 0.82, tone: 0.66, reverb: 0.14, delay: 0.02, volume: 0.45 },
  },
]

export const DEFAULT_EFFECT_SETTINGS = EFFECT_PRESETS[0].settings
