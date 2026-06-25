// src/components/goals/WinItem.tsx
'use client'

import { COMPETENCY_META } from '@/lib/growth/score'
import type { Win } from '@/lib/types'
import { cn } from '@/lib/utils'

function fmtDate(iso: string): string {
  // happened_at is a yyyy-mm-dd date; parse as local to avoid TZ drift.
  const [y, m, d] = iso.split('-').map(Number)
  if (!y) return iso
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface WinItemProps {
  win:        Win
  goalTitle?: string
  compact?:   boolean
  onEdit?:    (win: Win) => void
  onDelete?:  (win: Win) => void
  busy?:      boolean
}

export function WinItem({ win, goalTitle, compact, onEdit, onDelete, busy }: WinItemProps) {
  const meta = win.competency ? COMPETENCY_META[win.competency] : null

  // Compact: an evidence chip shown beneath a goal's progress meter.
  if (compact) {
    return (
      <span className={cn('group inline-flex max-w-full items-center gap-1.5 rounded-[20px] border border-border bg-white/70 py-1 pl-2 pr-1.5 text-[11px]', busy && 'opacity-50')}>
        <i className="ti ti-trophy text-[12px] text-[#B8860B]" aria-hidden="true" />
        {meta && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />}
        <button
          type="button"
          onClick={() => onEdit?.(win)}
          className="max-w-[160px] truncate text-left text-foreground/85 hover:text-foreground"
          title={win.title}
        >
          {win.title}
        </button>
        <span className="font-mono text-[10px] text-muted-foreground">{fmtDate(win.happened_at)}</span>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(win)}
            disabled={busy}
            aria-label="Remove win"
            className="opacity-0 transition-opacity hover:text-[#993C1D] group-hover:opacity-60 disabled:cursor-not-allowed"
          >
            <i className="ti ti-x text-[12px]" aria-hidden="true" />
          </button>
        )}
      </span>
    )
  }

  // Full row — used in the standalone Wins list.
  return (
    <div className={cn('flex items-start gap-3 rounded-[12px] border border-border bg-card px-3.5 py-3', busy && 'opacity-50')}>
      <i className="ti ti-trophy mt-0.5 text-[15px] text-[#B8860B]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug text-foreground">{win.title}</p>
        {win.detail && <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{win.detail}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">{fmtDate(win.happened_at)}</span>
          {meta && (
            <span className="rounded-[20px] px-1.5 py-px text-[10px] font-mono" style={{ background: `${meta.color}1A`, color: meta.color }}>
              {meta.label}
            </span>
          )}
          {goalTitle && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground" title={`Evidence toward: ${goalTitle}`}>
              <i className="ti ti-target text-[11px]" aria-hidden="true" />
              <span className="max-w-[160px] truncate">{goalTitle}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onEdit && (
          <button type="button" onClick={() => onEdit(win)} disabled={busy} aria-label="Edit win"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-50">
            <i className="ti ti-pencil text-[13px]" aria-hidden="true" />
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={() => onDelete(win)} disabled={busy} aria-label="Delete win"
            className="rounded-md p-1 text-muted-foreground hover:text-[#993C1D] disabled:opacity-50">
            <i className="ti ti-trash text-[13px]" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
