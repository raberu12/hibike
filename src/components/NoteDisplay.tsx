import type { NoteMatch } from '../utils/noteMapping'

type NoteDisplayProps = {
  match: NoteMatch | null
  frequency: number | null
  isListening: boolean
  error: string | null
}

export function NoteDisplay({
  match,
  frequency,
  isListening,
  error,
}: NoteDisplayProps) {
  const statusTone = getStatusTone(match?.status)

  return (
    <section className="rounded-3xl border border-slate-700/70 bg-slate-900/80 p-8 text-center shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
        {isListening ? 'Listening' : 'Ready'}
      </p>

      <div className="mt-6 text-8xl font-black tracking-tighter text-white sm:text-9xl">
        {match?.note ?? '—'}
      </div>

      <p className={`mt-4 text-2xl font-bold ${statusTone}`}>
        {match?.status ?? (error ? 'Mic unavailable' : 'Tap start to tune')}
      </p>

      <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-950/70 p-4">
          <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Frequency
          </dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">
            {frequency ? `${frequency.toFixed(1)} Hz` : '—'}
          </dd>
        </div>
        <div className="rounded-2xl bg-slate-950/70 p-4">
          <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Target
          </dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">
            {match ? `${match.targetFrequency.toFixed(2)} Hz` : '—'}
          </dd>
        </div>
        <div className="rounded-2xl bg-slate-950/70 p-4">
          <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Deviation
          </dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">
            {match ? `${match.cents > 0 ? '+' : ''}${match.cents.toFixed(0)}¢` : '—'}
          </dd>
        </div>
      </dl>

      {error ? (
        <p className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-950/40 p-4 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </section>
  )
}

function getStatusTone(status: NoteMatch['status'] | undefined) {
  if (status === 'In Tune') {
    return 'text-emerald-300'
  }

  if (status === 'Flat') {
    return 'text-sky-300'
  }

  if (status === 'Sharp') {
    return 'text-amber-300'
  }

  return 'text-slate-400'
}
