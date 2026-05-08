import type { EffectPreset, EffectPresetId, EffectSettings } from '../utils/effects'

type EffectsPanelProps = {
  isListening: boolean
  isMonitoring: boolean
  error: string | null
  settings: EffectSettings
  presets: EffectPreset[]
  selectedPresetId: EffectPresetId | null
  start: () => Promise<void>
  stop: () => void
  enableMonitoring: () => Promise<void>
  disableMonitoring: () => void
  applyPreset: (presetId: EffectPresetId) => void
  setEffectSetting: (key: keyof EffectSettings, value: number) => void
}

const CONTROL_LABELS: Record<keyof EffectSettings, string> = {
  drive: 'Drive',
  tone: 'Tone',
  reverb: 'Reverb',
  delay: 'Delay',
  volume: 'Volume',
}

const CONTROL_HELP: Record<keyof EffectSettings, string> = {
  drive: 'Adds overdrive and electric-style grit.',
  tone: 'Darker on the left, brighter on the right.',
  reverb: 'Adds room and tail around the uke.',
  delay: 'Adds echo repeats behind the note.',
  volume: 'Controls the processed monitor output.',
}

export function EffectsPanel({
  isListening,
  isMonitoring,
  error,
  settings,
  presets,
  selectedPresetId,
  start,
  stop,
  enableMonitoring,
  disableMonitoring,
  applyPreset,
  setEffectSetting,
}: EffectsPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Effects sandbox
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">Live uke tones</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Use headphones before enabling monitor to avoid speaker feedback. The
            tuner still listens to the clean mic signal while effects shape what
            you hear.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={start}
            disabled={isListening}
            className="rounded-full bg-cyan-300 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Start input
          </button>
          <button
            type="button"
            onClick={stop}
            disabled={!isListening}
            className="rounded-full border border-slate-600 px-5 py-3 font-bold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Stop
          </button>
          <button
            type="button"
            onClick={isMonitoring ? disableMonitoring : enableMonitoring}
            className={`rounded-full px-5 py-3 font-bold transition ${
              isMonitoring
                ? 'bg-rose-300 text-rose-950 hover:bg-rose-200'
                : 'border border-amber-300/60 text-amber-100 hover:bg-amber-300/10'
            }`}
          >
            {isMonitoring ? 'Mute monitor' : 'Enable monitor'}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4 text-sm text-amber-100">
        {isMonitoring
          ? 'Monitor is on. Keep your volume low and use headphones.'
          : 'Monitor is off by default. Enable it only when headphones are ready.'}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-950/40 p-4 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {presets.map((preset) => {
          const isSelected = preset.id === selectedPresetId

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? 'border-cyan-300 bg-cyan-300/10 text-cyan-100'
                  : 'border-slate-700 bg-slate-950/50 text-slate-200 hover:border-slate-500'
              }`}
            >
              <span className="block font-bold">{preset.name}</span>
              <span className="mt-2 block text-xs leading-5 text-slate-400">
                {preset.description}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(Object.keys(settings) as Array<keyof EffectSettings>).map((key) => (
          <label
            key={key}
            className="rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white">{CONTROL_LABELS[key]}</span>
                <p className="mt-1 text-xs text-slate-400">{CONTROL_HELP[key]}</p>
              </div>
              <span className="text-sm font-semibold text-cyan-200">
                {Math.round(settings[key] * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings[key]}
              onChange={(event) => setEffectSetting(key, Number(event.target.value))}
              className="mt-4 w-full accent-cyan-300"
            />
          </label>
        ))}
      </div>
    </section>
  )
}
