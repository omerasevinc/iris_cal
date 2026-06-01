interface Props {
  label: string
  current: number
  target: number
  unit: string
  color: string
}

export function MacroRing({ label, current, target, unit, color }: Props) {
  const r = 36
  const circumference = 2 * Math.PI * r
  const ratio = target > 0 ? current / target : 0
  const clampedRatio = Math.min(ratio, 1)
  const offset = circumference * (1 - clampedRatio)

  const ringColor =
    ratio > 1 ? '#ef4444' : ratio >= 0.9 ? '#22c55e' : color

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-gray-900 leading-tight">
            {Math.round(current)}
          </span>
          <span className="text-[10px] text-gray-400 leading-tight">
            / {target} {unit}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </div>
  )
}
