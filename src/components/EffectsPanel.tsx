import type { EffectPreset, EffectPresetId, EffectSettings } from '../utils/effects'
import { SampleDataPanel } from './SampleDataPanel'

type EffectsPanelProps = {
  isMonitoring: boolean
  hasLiveFilteringSession: boolean
  error: string | null
  settings: EffectSettings
  presets: EffectPreset[]
  selectedPresetId: EffectPresetId | null
  isRecording: boolean
  recordingBlob: Blob | null
  processedRecordingBlob: Blob | null
  isProcessingRecording: boolean
  stop: () => void
  enableMonitoring: () => Promise<void>
  disableMonitoring: () => void
  applyPreset: (presetId: EffectPresetId) => void
  selectCustomPreset: () => void
  setEffectSetting: (key: keyof EffectSettings, value: number) => void
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearRecording: () => void
  processRecordingWithEffects: () => Promise<void>
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
  isMonitoring,
  hasLiveFilteringSession,
  error,
  settings,
  presets,
  selectedPresetId,
  isRecording,
  recordingBlob,
  processedRecordingBlob,
  isProcessingRecording,
  stop,
  enableMonitoring,
  disableMonitoring,
  applyPreset,
  selectCustomPreset,
  setEffectSetting,
  startRecording,
  stopRecording,
  clearRecording,
  processRecordingWithEffects,
}: EffectsPanelProps) {
  const selectedPresetName =
    presets.find((preset) => preset.id === selectedPresetId)?.name ?? 'Custom'
  const monitorButtonLabel = isMonitoring
    ? 'Mute live filtering'
    : hasLiveFilteringSession
      ? 'Unmute live filtering'
      : 'Start live filtering'
  const showStopControl = hasLiveFilteringSession
  const customPresetSelected = selectedPresetId === null

  return (
    <section className="rounded-3xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Effects sandbox
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">Live Filtering</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Use headphones before enabling monitor to avoid speaker feedback. The
            tuner still listens to the clean mic signal while effects shape what
            you hear.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-label={monitorButtonLabel}
            title={monitorButtonLabel}
            onClick={isMonitoring ? disableMonitoring : enableMonitoring}
            className={`inline-flex size-12 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
              isMonitoring
                ? 'border-emerald-300/40 bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/30 hover:bg-emerald-300 focus-visible:ring-emerald-300'
                : hasLiveFilteringSession
                  ? 'border-amber-300/40 bg-amber-300 text-amber-950 shadow-lg shadow-amber-950/30 hover:bg-amber-200 focus-visible:ring-amber-300'
                  : 'border-cyan-300/30 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/40 hover:bg-cyan-200 focus-visible:ring-cyan-300'
            }`}
          >
            <MicrophoneIcon className="size-5" />
          </button>
          {showStopControl ? (
            <button
              type="button"
              aria-label="Stop live filtering"
              title="Stop live filtering"
              onClick={stop}
              className="inline-flex size-12 items-center justify-center rounded-full border border-rose-300/40 bg-rose-300 text-rose-950 shadow-lg shadow-rose-950/30 transition hover:bg-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <StopIcon className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4 text-sm text-amber-100">
        {isMonitoring
          ? 'Effects are audible. Keep your volume low and use headphones.'
          : hasLiveFilteringSession
            ? 'Effects are muted. Use Unmute when headphones are ready.'
            : 'Effects are off. Start effects only when headphones are ready.'}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-950/40 p-4 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {presets.map((preset) => {
          const isSelected = preset.id === selectedPresetId

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`flex h-full flex-col rounded-2xl border p-4 text-left transition ${
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

        <button
          type="button"
          aria-pressed={customPresetSelected}
          onClick={selectCustomPreset}
          className={`flex h-full flex-col rounded-2xl border p-4 text-left transition ${
            customPresetSelected
              ? 'border-cyan-300 bg-cyan-300/10 text-cyan-100'
              : 'border-slate-700 bg-slate-950/50 text-slate-200'
          }`}
        >
          <span className="block font-bold">Custom</span>
          <span className="mt-2 block h-[2.5rem]" aria-hidden="true" />
        </button>
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

      <SampleDataPanel
        isRecording={isRecording}
        recordingBlob={recordingBlob}
        processedRecordingBlob={processedRecordingBlob}
        isProcessingRecording={isProcessingRecording}
        selectedPresetName={selectedPresetName}
        startRecording={startRecording}
        stopRecording={stopRecording}
        clearRecording={clearRecording}
        processRecordingWithEffects={processRecordingWithEffects}
      />
    </section>
  )
}

type IconProps = {
  className?: string
}

function MicrophoneIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <rect x="7" y="3" width="6" height="10" rx="3" />
      <path d="M5.5 9.5a4.5 4.5 0 1 0 9 0" strokeLinecap="round" />
      <path d="M10 14v3" strokeLinecap="round" />
      <path d="M7.5 17h5" strokeLinecap="round" />
    </svg>
  )
}

function StopIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.5" />
    </svg>
  )
}
