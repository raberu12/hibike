import { useMemo } from 'react'
import { useAudio } from '../hooks/useAudio'
import { getClosestUkuleleNote } from '../utils/noteMapping'
import { NoteDisplay } from './NoteDisplay'
import { StringVisualizer } from './StringVisualizer'
import { TuningMeter } from './TuningMeter'

export function Tuner() {
  const { frequency, isListening, error, start, stop } = useAudio()
  const match = useMemo(
    () => (frequency ? getClosestUkuleleNote(frequency) : null),
    [frequency],
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_55%,_#111827)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="text-center">
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">
            Hibike
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            Tune standard ukulele strings G4, C4, E4, and A4 with live pitch
            detection and cents deviation.
          </p>
        </header>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={isListening}
            className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Start listening
          </button>
          <button
            type="button"
            onClick={stop}
            disabled={!isListening}
            className="rounded-full border border-slate-600 px-6 py-3 font-bold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Stop
          </button>
        </div>

        <NoteDisplay
          match={match}
          frequency={frequency}
          isListening={isListening}
          error={error}
        />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <TuningMeter cents={match?.cents ?? null} />
          <StringVisualizer activeNote={match?.note ?? null} />
        </div>
      </div>
    </main>
  )
}
