import { useEffect, useMemo } from 'react'
import { downloadBlob, generateUkulelePluckWav } from '../utils/wav'

type SampleDataPanelProps = {
  isListening: boolean
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
  isListening,
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

        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
          {isRecording
            ? `Recording clean audio, max ${MAX_RECORDING_SECONDS}s`
            : isListening
              ? 'Mic is ready for clean recording'
              : 'Mic starts when recording begins'}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
          <h4 className="text-xl font-black text-white">Generated uke pluck</h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Creates a synthesized ukulele-like pluck with decaying harmonics so
            the project has a repeatable realistic sample WAV without bundled assets.
          </p>
          <button
            type="button"
            onClick={downloadGeneratedPluck}
            className="mt-5 rounded-full bg-cyan-300 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200"
          >
            Download pluck WAV
          </button>
        </article>

        <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
          <h4 className="text-xl font-black text-white">Clean mic recording</h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Record a short dry ukulele take for up to {MAX_RECORDING_SECONDS} seconds,
            then play, effect, or download it.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startRecording}
              disabled={isRecording}
              className="rounded-full bg-cyan-300 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Start recording
            </button>
            <button
              type="button"
              onClick={stopRecording}
              disabled={!isRecording}
              className="rounded-full border border-slate-600 px-5 py-3 font-bold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Stop recording
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
            {recordingSizeLabel}
            {dryRecordingUrl ? (
              <audio controls src={dryRecordingUrl} className="mt-3 w-full" />
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (recordingBlob) {
                  downloadBlob(recordingBlob, 'hibike-mic-take.wav')
                }
              }}
              disabled={!recordingBlob}
              className="rounded-full bg-emerald-300 px-5 py-3 font-bold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Download dry WAV
            </button>
            <button
              type="button"
              onClick={processRecordingWithEffects}
              disabled={!recordingBlob || isProcessingRecording || isRecording}
              className="rounded-full bg-violet-300 px-5 py-3 font-bold text-violet-950 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isProcessingRecording ? 'Applying effects…' : 'Apply current effects'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (processedRecordingBlob) {
                  downloadBlob(processedRecordingBlob, 'hibike-effected-take.wav')
                }
              }}
              disabled={!processedRecordingBlob}
              className="rounded-full bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Download effected WAV
            </button>
            <button
              type="button"
              onClick={clearRecording}
              disabled={!recordingBlob && !processedRecordingBlob && !isRecording}
              className="rounded-full border border-slate-600 px-5 py-3 font-bold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-950/20 p-4 text-sm text-violet-100">
            {processedSizeLabel}
            {effectedRecordingUrl ? (
              <audio controls src={effectedRecordingUrl} className="mt-3 w-full" />
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

function downloadGeneratedPluck() {
  downloadBlob(generateUkulelePluckWav(), 'hibike-uke-pluck.wav')
}
