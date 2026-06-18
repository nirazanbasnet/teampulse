// src/components/report/Radar.tsx
'use client'

import type { CompetencyScore } from '@/lib/growth/score'
import { COMPETENCY_META } from '@/lib/growth/score'

interface RadarProps {
  competencies: CompetencyScore[]
}

// The viewBox is intentionally larger than the plotted pentagon so the axis
// LABELS live inside the SVG's own box. The element then scales to its column
// (width:100%) — labels can never overflow into neighbouring content the way an
// `overflow-visible` fixed-size chart did.
const W = 400, H = 300, CX = 200, CY = 142, R = 94, RL = 112

function polar(r: number, i: number, n: number): [number, number] {
  const a = (i / n) * 2 * Math.PI - Math.PI / 2   // first axis points up
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

export function Radar({ competencies }: RadarProps) {
  const n     = competencies.length
  const rings = [0.25, 0.5, 0.75, 1]

  const ringPoints = (f: number) => competencies.map((_, i) => polar(R * f, i, n).join(',')).join(' ')
  const dataPts    = competencies.map((c, i) => polar((Math.max(0, c.score ?? 0) / 100) * R, i, n))
  const dataPath   = dataPts.map(p => p.join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="mx-auto max-w-[340px]" role="img" aria-label="Competency radar chart">
      {/* grid rings */}
      {rings.map((f, i) => (
        <polygon key={i} points={ringPoints(f)} fill="none" stroke="currentColor" className="text-border" strokeWidth={1} />
      ))}
      {/* axes */}
      {competencies.map((_, i) => {
        const [x, y] = polar(R, i, n)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} />
      })}
      {/* data shape */}
      <polygon points={dataPath} fill="#1D9E75" fillOpacity={0.14} stroke="#1D9E75" strokeWidth={2} strokeLinejoin="round" />
      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="#1D9E75" stroke="#fff" strokeWidth={1.5} />
      ))}
      {/* labels — anchored outward, kept within the viewBox */}
      {competencies.map((c, i) => {
        const [x, y]  = polar(RL, i, n)
        const anchor  = Math.abs(x - CX) < 10 ? 'middle' : x > CX ? 'start' : 'end'
        return (
          <text
            key={c.key}
            x={x} y={y}
            textAnchor={anchor as 'start' | 'middle' | 'end'}
            dominantBaseline="middle"
            style={{
              fontSize:      11,
              fontFamily:    'var(--font-mono)',
              letterSpacing: '0.02em',
              fill:          c.score === null ? '#a0a09d' : COMPETENCY_META[c.key].color,
            }}
          >
            {COMPETENCY_META[c.key].label}
          </text>
        )
      })}
    </svg>
  )
}
