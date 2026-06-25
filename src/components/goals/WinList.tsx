// src/components/goals/WinList.tsx
'use client'

import { WinItem } from './WinItem'
import type { Goal, Win } from '@/lib/types'

interface WinListProps {
  wins:      Win[]
  goals:     Goal[]
  onEdit:    (win: Win) => void
  onDelete:  (win: Win) => void
  busyIds?:  Set<string>
  emptyLabel?: string
}

// A reverse-chron list of full win rows (used for the standalone Wins
// section). Resolves each win's linked goal title for display.
export function WinList({ wins, goals, onEdit, onDelete, busyIds, emptyLabel }: WinListProps) {
  if (wins.length === 0) {
    return (
      <p className="rounded-[12px] border border-dashed border-border px-4 py-5 text-center text-[12px] text-muted-foreground">
        {emptyLabel ?? 'No wins logged yet — log one when you ship something.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {wins.map(win => (
        <WinItem
          key={win.id}
          win={win}
          goalTitle={win.goal_id ? goals.find(g => g.id === win.goal_id)?.title : undefined}
          onEdit={onEdit}
          onDelete={onDelete}
          busy={busyIds?.has(win.id)}
        />
      ))}
    </div>
  )
}
