import { useEffect, useMemo } from 'react'
import { downloadBlob, generateUkulelePluckWav } from '../utils/wav'

type SampleDataPanelProps = {
  isRecording: boolean
  recordingBlob: Blob | null
  processedRecordingBlob: Blob | null
  isProcessingRecording: boolean
  selectedPresetName: string
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearRecording: () => void
  processRecordingWithEffects: () => Promise<void>
}

const MAX_RECORDING_SECONDS = 20

export function SampleDataPanel({
  isRecording,
  recordingBlob,
  processedRecordingBlob,
  isProcessingRecording,
  selectedPresetName,
  startRecording,
  stopRecording,
  clearRecording,
  processRecordingWithEffects,
}: SampleDataPanelProps) {
  const dryRecordingUrl = useBlobUrl(recordingBlob)
  const effectedRecordingUrl = useBlobUrl(processedRecordingBlob)
  const recordingSizeLabel = recordingBlob
    ? `${(recordingBlob.size / 1024).toFixed(1)} KB dry WAV ready`
    : 'No recording yet'
  const processedSizeLabel = processedRecordingBlob
    ? `${(processedRecordingBlob.size / 1024).toFixed(1)} KB effected WAV ready`
    : `No effected WAV yet — current preset: ${selectedPresetName}`
  const canClear = Boolean(recordingBlob || processedRecordingBlob || isRecording)

  return (
    <div className="mt-8 rounded-3xl border border-slate-700/70 bg-slate-950/40 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">
            Record & export
          </p>
          <h3 className="mt-3 text-2xl font-black text-white">Recording WAV tools</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Record clean mic audio, play it back, render it through the current
            Effects preset, and download dry/effected WAV files. Everything stays
            local in your browser; no files are uploaded.
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-base font-black text-white">Generated Uke Pluck</h4>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Download a repeatable synthesized sample WAV for quick playback and effects tests.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadGeneratedPluck}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-bold text-cyan-100 transition hover:bg-cyan-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <DownloadIcon className="size-4" />
            Download WAV
          </button>
        </div>
      </section>

      <div className="mt-4 grid gap-4">
        <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
          <h4 className="text-xl font-black text-white">Clean mic recording</h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Record a short dry ukulele take for up to {MAX_RECORDING_SECONDS} seconds,
            then play, effect, or download it.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              title={isRecording ? 'Stop recording' : 'Start recording'}
              onClick={isRecording ? stopRecording : startRecording}
              className={`inline-flex size-12 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                isRecording
                  ? 'border-emerald-300/40 bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/30 hover:bg-emerald-300 focus-visible:ring-emerald-300'
                  : 'border-cyan-300/30 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/40 hover:bg-cyan-200 focus-visible:ring-cyan-300'
              }`}
            >
              <MicrophoneIcon className="size-5" />
            </button>

            <button
              type="button"
              onClick={clearRecording}
              disabled={!canClear}
              className="rounded-full border border-slate-600 px-5 py-3 font-bold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>

            {isRecording ? (
              <span className="text-sm font-semibold text-emerald-200">
                Recording… max {MAX_RECORDING_SECONDS}s
              </span>
            ) : null}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{recordingSizeLabel}</span>
              <IconActionButton
                label="Download dry WAV"
                disabled={!recordingBlob}
                onClick={() => {
                  if (recordingBlob) {
                    downloadBlob(recordingBlob, 'hibike-mic-take.wav')
                  }
                }}
              />
            </div>
            {dryRecordingUrl ? (
              <div className="mt-3 flex items-center gap-3">
                <audio controls src={dryRecordingUrl} className="min-w-0 flex-1" />
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={processRecordingWithEffects}
              disabled={!recordingBlob || isProcessingRecording || isRecording}
              className="rounded-full bg-violet-300 px-5 py-3 font-bold text-violet-950 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isProcessingRecording ? 'Applying effects…' : 'Apply current effects'}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-950/20 p-4 text-sm text-violet-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{processedSizeLabel}</span>
              <IconActionButton
                label="Download effected WAV"
                disabled={!processedRecordingBlob}
                onClick={() => {
                  if (processedRecordingBlob) {
                    downloadBlob(processedRecordingBlob, 'hibike-effected-take.wav')
                  }
                }}
                tone="violet"
              />
            </div>
            {effectedRecordingUrl ? (
              <div className="mt-3 flex items-center gap-3">
                <audio controls src={effectedRecordingUrl} className="min-w-0 flex-1" />
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  )
}

function useBlobUrl(blob: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])

  useEffect(() => {
    if (!url) {
      return
    }

    return () => URL.revokeObjectURL(url)
  }, [url])

  return url
}

type IconActionButtonProps = {
  label: string
  disabled: boolean
  onClick: () => void
  tone?: 'slate' | 'violet'
}

function IconActionButton({
  label,
  disabled,
  onClick,
  tone = 'slate',
}: IconActionButtonProps) {
  const toneClassName =
    tone === 'violet'
      ? 'border-violet-300/30 bg-violet-300/10 text-violet-100 hover:bg-violet-300/20 focus-visible:ring-violet-300'
      : 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20 focus-visible:ring-emerald-300'

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 ${toneClassName}`}
    >
      <DownloadIcon className="size-4" />
    </button>
  )
}

type IconProps = {
  className?: string
}

function DownloadIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 3.75v8.5" strokeLinecap="round" />
      <path d="m6.75 9.75 3.25 3.5 3.25-3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15.25h12" strokeLinecap="round" />
    </svg>
  )
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

function downloadGeneratedPluck() {
  downloadBlob(generateUkulelePluckWav(), 'hibike-uke-pluck.wav')
}
