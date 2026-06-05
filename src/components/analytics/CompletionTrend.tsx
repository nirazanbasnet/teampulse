// src/components/analytics/CompletionTrend.tsx
'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface TrendPoint {
  cycle:      string
  completion: number
  total:      number
}

interface CompletionTrendProps {
  data: TrendPoint[]
}

export function CompletionTrend({ data }: CompletionTrendProps) {
  if (data.length < 2) {
    return (
      <div className="h-[120px] flex items-center justify-center text-muted-foreground/70 text-[12px]">
        Need at least 2 cycles to show trend
      </div>
    )
  }

  return (
    <div className="h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-tertiary)"
            vertical={false}
          />
          <XAxis
            dataKey="cycle"
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background:   'var(--color-background-primary)',
              border:       '0.5px solid var(--color-border-secondary)',
              borderRadius: 8,
              fontSize:     12,
              color:        'var(--color-text-primary)',
            }}
            formatter={(v: number) => [`${v}%`, 'Completion']}
          />
          <Line
            type="monotone"
            dataKey="completion"
            stroke="#1D9E75"
            strokeWidth={2}
            dot={{ fill: '#1D9E75', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
