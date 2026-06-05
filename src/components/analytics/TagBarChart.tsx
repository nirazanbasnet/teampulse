// src/components/analytics/TagBarChart.tsx
'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { NoteTag } from '@/lib/types'

interface TagBarChartProps {
  data:   Record<NoteTag, number>
  color?: string
}

const TAGS: NoteTag[] = ['Collaboration', 'Technical', 'Communication', 'Delivery', 'Leadership']

export function TagBarChart({ data, color = '#1D9E75' }: TagBarChartProps) {
  const chartData = TAGS.map(tag => ({ tag: tag.slice(0, 6), fullTag: tag, count: data[tag] ?? 0 }))
    .sort((a, b) => b.count - a.count)

  const max = Math.max(...chartData.map(d => d.count), 1)

  return (
    <div className="h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
          <XAxis
            type="number"
            domain={[0, max]}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            tickLine={false}
            axisLine={false}
            tickCount={max > 4 ? 5 : max + 1}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="fullTag"
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-background-secondary)' }}
            contentStyle={{
              background:   'var(--color-background-primary)',
              border:       '0.5px solid var(--color-border-secondary)',
              borderRadius: 8,
              fontSize:     12,
              color:        'var(--color-text-primary)',
            }}
            formatter={(v: number) => [v, 'notes']}
            labelFormatter={(l: string) => l}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={10}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.tag}
                fill={color}
                opacity={1 - index * 0.12}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
