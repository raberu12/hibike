import { useState } from 'react'
import {
  UKULELE_STRINGS,
} from '../utils/noteMapping'
import { useAudio, type TunerTarget } from '../hooks/useAudio'
import { EffectsPanel } from './EffectsPanel'
import { NoteDisplay } from './NoteDisplay'
import { StringVisualizer } from './StringVisualizer'
import { TuningMeter } from './TuningMeter'

type AppMode = 'tune' | 'effects'

export function Tuner() {
  const [mode, setMode] = useState<AppMode>('tune')
  const [selectedNote, setSelectedNote] = useState<TunerTarget>('G4')
  const audio = useAudio(selectedNote)
  const displayMatch = audio.match

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_55%,_#111827)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="text-center">
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">
            Hibike
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            Tune standard ukulele strings G4, C4, E4, and A4, then experiment
            with local live effects for electric and ambient uke tones.
          </p>
        </header>

        <div className="mx-auto grid w-full max-w-md grid-cols-2 rounded-full border border-slate-700 bg-slate-950/70 p-1">
          <button
            type="button"
            onClick={() => setMode('tune')}
            className={`rounded-full px-5 py-3 font-bold transition ${
              mode === 'tune'
                ? 'bg-cyan-300 text-slate-950'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Tune
          </button>
          <button
            type="button"
            onClick={() => setMode('effects')}
            className={`rounded-full px-5 py-3 font-bold transition ${
              mode === 'effects'
                ? 'bg-cyan-300 text-slate-950'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Effects
          </button>
        </div>

        {mode === 'tune' ? (
          <>
            <section className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4 shadow-xl shadow-slate-950/20">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-300">
                Select string
              </h2>

              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-5"
                role="radiogroup"
                aria-label="Select ukulele string"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedNote === 'auto'}
                  onClick={() => setSelectedNote('auto')}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    selectedNote === 'auto'
                      ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30'
                      : 'border-slate-700 bg-slate-950/70 text-slate-100 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-2xl font-black tracking-tight">Auto</span>
                  <span
                    className={`mt-1 block text-xs font-medium uppercase tracking-[0.2em] ${
                      selectedNote === 'auto' ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    Detect
                  </span>
                </button>

                {UKULELE_STRINGS.map((string) => {
                  const isSelected = selectedNote === string.note

                  return (
                    <button
                      key={string.note}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedNote(string.note)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        isSelected
                          ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30'
                          : 'border-slate-700 bg-slate-950/70 text-slate-100 hover:border-slate-500 hover:bg-slate-800'
                      }`}
                    >
                      <span className="block text-2xl font-black tracking-tight">
                        {string.note}
                      </span>
                      <span
                        className={`mt-1 block text-xs font-medium uppercase tracking-[0.2em] ${
                          isSelected ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {string.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={audio.start}
                disabled={audio.isListening}
                className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                Start listening
              </button>
              <button
                type="button"
                onClick={audio.stop}
                disabled={!audio.isListening}
                className="rounded-full border border-slate-600 px-6 py-3 font-bold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Stop
              </button>
            </div>

            <NoteDisplay
              match={displayMatch}
              selectedNote={selectedNote}
              frequency={audio.frequency}
              isListening={audio.isListening}
              error={audio.error}
            />

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <TuningMeter cents={displayMatch?.cents ?? null} />
              <StringVisualizer activeNote={selectedNote === 'auto' ? (displayMatch?.note ?? null) : selectedNote} />
            </div>
          </>
        ) : (
            <EffectsPanel
              isMonitoring={audio.isMonitoring}
              hasLiveFilteringSession={audio.hasLiveFilteringSession}
              error={audio.error}
            settings={audio.effectSettings}
            presets={audio.presets}
            selectedPresetId={audio.selectedPresetId}
            isRecording={audio.isRecording}
            recordingBlob={audio.recordingBlob}
            processedRecordingBlob={audio.processedRecordingBlob}
            isProcessingRecording={audio.isProcessingRecording}
            stop={audio.stop}
            enableMonitoring={audio.enableMonitoring}
              disableMonitoring={audio.disableMonitoring}
              applyPreset={audio.applyEffectPreset}
              selectCustomPreset={audio.selectCustomPreset}
              setEffectSetting={audio.setEffectSetting}
            startRecording={audio.startRecording}
            stopRecording={audio.stopRecording}
            clearRecording={audio.clearRecording}
            processRecordingWithEffects={audio.processRecordingWithEffects}
          />
        )}
      </div>
    </main>
  )
}
