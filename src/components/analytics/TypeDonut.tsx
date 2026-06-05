// src/components/analytics/TypeDonut.tsx
'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { NoteType } from '@/lib/types'

interface TypeDonutProps {
  data:  Record<NoteType, number>
  total: number
}

const TYPE_CONFIG: Record<NoteType, { label: string; color: string }> = {
  general:  { label: 'General',  color: '#EAB308' },
  strength: { label: 'Strength', color: '#1D9E75' },
  growth:   { label: 'Growth',   color: '#378ADD' },
}

export function TypeDonut({ data, total }: TypeDonutProps) {
  const chartData = (Object.entries(data) as [NoteType, number][])
    .filter(([, v]) => v > 0)
    .map(([type, count]) => ({
      name:  TYPE_CONFIG[type].label,
      value: count,
      color: TYPE_CONFIG[type].color,
      pct:   total > 0 ? Math.round(count / total * 100) : 0,
    }))

  if (total === 0) {
    return (
      <div className="h-[160px] flex items-center justify-center text-muted-foreground/70 text-[13px]">
        No notes yet
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0 basis-[140px] h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map(entry => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background:   'var(--color-background-primary)',
                border:       '0.5px solid var(--color-border-secondary)',
                borderRadius: 8,
                fontSize:     12,
                color:        'var(--color-text-primary)',
              }}
              formatter={(v: number, name: string) => [v, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {chartData.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="w-[10px] h-[10px] rounded-full shrink-0"
              style={{ background: d.color }}
            />
            <span className="text-[12px] flex-1 text-muted-foreground">
              {d.name}
            </span>
            <span className="text-[12px] font-medium font-mono">
              {d.value}
            </span>
            <span className="text-[11px] text-muted-foreground/70 font-mono w-8 text-right">
              {d.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
