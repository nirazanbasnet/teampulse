// src/components/report/ScoreRing.tsx
'use client'

interface ScoreRingProps {
  score: number | null   // 0–100
  size?: number
  label?: string
}

// A circular gauge for the overall growth score. The arc colour shifts
// from amber (needs focus) through to the brand green (exceptional).
export function ScoreRing({ score, size = 132, label }: ScoreRingProps) {
  const stroke = 9
  const r      = (size - stroke) / 2
  const c      = 2 * Math.PI * r
  const pct    = score === null ? 0 : Math.max(0, Math.min(100, score))
  const dash   = (pct / 100) * c

  const color =
    score === null ? '#a0a09d' :
    score >= 70    ? '#1D9E75' :
    score >= 55    ? '#0F6E56' :
    score >= 40    ? '#854F0B' :
                     '#C0392B'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[30px] leading-none font-medium" style={{ color }}>
          {score === null ? '—' : score}
        </span>
        {label && (
          <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        )}
      </div>
    </div>
  )
}
