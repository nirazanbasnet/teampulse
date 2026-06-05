// src/components/board/MetricsBar.tsx
'use client'

interface MetricsBarProps {
  totalNotes:  number
  doneNotes:   number
  memberCount: number
  cycleName:   string | null
}

export function MetricsBar({ totalNotes, doneNotes, memberCount, cycleName }: MetricsBarProps) {
  const pct = totalNotes > 0 ? Math.round(doneNotes / totalNotes * 100) : 0

  const stats = [
    { label: 'Notes this cycle', value: totalNotes, icon: 'ti-note' },
    { label: 'Done',             value: doneNotes,  icon: 'ti-check' },
    { label: 'Completion',       value: `${pct}%`,  icon: 'ti-chart-bar' },
    { label: 'Members',          value: memberCount, icon: 'ti-users' },
  ]

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted overflow-x-auto">
      {cycleName && (
        <>
          <div className="flex items-center gap-[5px] px-[10px] py-[3px] rounded-[20px] bg-accent text-accent-foreground text-[11px] font-mono shrink-0">
            <span className="w-[5px] h-[5px] rounded-full bg-primary inline-block" />
            {cycleName} · Active
          </div>
          <div className="w-px h-4 bg-border shrink-0" />
        </>
      )}

      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border shrink-0">
          <span className="text-[18px] font-medium text-foreground">
            {s.value}
          </span>
          <span className="text-[11px] text-muted-foreground leading-[1.3]">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}
