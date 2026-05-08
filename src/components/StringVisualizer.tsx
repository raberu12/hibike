import { UKULELE_STRINGS, type UkuleleNoteName } from '../utils/noteMapping'

type StringVisualizerProps = {
  activeNote: UkuleleNoteName | null
}

export function StringVisualizer({ activeNote }: StringVisualizerProps) {
  return (
    <section className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Ukulele Strings</h2>
      </div>

      <svg
        viewBox="0 0 640 220"
        role="img"
        aria-label="Four ukulele strings visualizer"
        className="h-auto w-full overflow-visible"
      >
        <defs>
          <linearGradient id="bodyGlow" x1="0" x2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#164e63" />
          </linearGradient>
        </defs>
        <rect x="20" y="24" width="600" height="172" rx="48" fill="url(#bodyGlow)" />
        <rect x="62" y="52" width="54" height="116" rx="14" fill="#1e293b" />
        <rect x="524" y="52" width="54" height="116" rx="14" fill="#1e293b" />

        {UKULELE_STRINGS.map((string, index) => {
          const y = 68 + index * 28
          const isActive = activeNote === string.note

          return (
            <g key={string.note}>
              <line
                x1="84"
                y1={y}
                x2="556"
                y2={y}
                stroke={isActive ? '#67e8f9' : '#94a3b8'}
                strokeWidth={isActive ? 6 : 3}
                strokeLinecap="round"
                className="transition-all duration-150"
              />
              <circle cx="84" cy={y} r="8" fill={isActive ? '#67e8f9' : '#475569'} />
              <circle cx="556" cy={y} r="8" fill={isActive ? '#67e8f9' : '#475569'} />
              <text
                x="34"
                y={y + 6}
                fill={isActive ? '#a5f3fc' : '#cbd5e1'}
                fontSize="20"
                fontWeight="700"
              >
                {string.note}
              </text>
            </g>
          )
        })}
      </svg>
    </section>
  )
}
