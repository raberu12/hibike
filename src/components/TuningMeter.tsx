type TuningMeterProps = {
  cents: number | null
}

const MAX_CENTS = 50

export function TuningMeter({ cents }: TuningMeterProps) {
  const clampedCents = Math.max(-MAX_CENTS, Math.min(MAX_CENTS, cents ?? 0))
  const offsetPercent = (clampedCents / MAX_CENTS) * 50
  const needleLeft = `calc(50% + ${offsetPercent}%)`

  return (
    <section className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex items-center justify-between text-sm font-medium text-slate-400">
        <span>Flat</span>
        <span className="text-emerald-300">In Tune</span>
        <span>Sharp</span>
      </div>

      <div className="relative h-20 rounded-full bg-slate-950/80 px-4">
        <div className="absolute left-1/2 top-3 h-14 w-1 -translate-x-1/2 rounded-full bg-emerald-400/70" />
        <div className="absolute inset-x-6 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400" />
        <div
          className="absolute top-1/2 h-16 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg shadow-cyan-300/40 transition-[left] duration-150 ease-out"
          style={{ left: needleLeft }}
          aria-label={`Tuning deviation ${cents?.toFixed(0) ?? 0} cents`}
        />
      </div>

      <div className="mt-4 flex justify-between text-xs text-slate-500">
        <span>-50¢</span>
        <span>0¢</span>
        <span>+50¢</span>
      </div>
    </section>
  )
}
