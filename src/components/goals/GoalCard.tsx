// src/components/goals/GoalCard.tsx
'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { COMPETENCY_META } from '@/lib/growth/score'
import { setGoalProgress, setGoalStatus } from '@/server/actions/goals'
import { useToast } from '@/components/shared/ToastProvider'
import { WinItem } from './WinItem'
import type { Goal, GoalStatus, Win } from '@/lib/types'
import { cn } from '@/lib/utils'

const BRAND = '#1D9E75'

const STATUS_META: Record<GoalStatus, { label: string; color: string; bg: string }> = {
  active:   { label: 'Active',   color: '#185FA5', bg: '#E6F1FB' },
  achieved: { label: 'Achieved', color: '#0F6E56', bg: '#E1F5EE' },
  missed:   { label: 'Missed',   color: '#854F0B', bg: '#FBF0E2' },
  dropped:  { label: 'Dropped',  color: '#6b6b67', bg: '#EFEFEC' },
}

const STATUS_ORDER: GoalStatus[] = ['active', 'achieved', 'missed', 'dropped']

function fmtDue(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface GoalCardProps {
  goal:        Goal
  wins:        Win[]
  onChanged:   (goal: Goal) => void
  onEdit:      (goal: Goal) => void
  onDelete:    (goal: Goal) => void
  onAddWin:    (goalId: string) => void
  onEditWin:   (win: Win) => void
  onDeleteWin: (win: Win) => void
  winBusyIds?: Set<string>
}

export function GoalCard({
  goal, wins, onChanged, onEdit, onDelete, onAddWin, onEditWin, onDeleteWin, winBusyIds,
}: GoalCardProps) {
  const { toast } = useToast()
  const [draft, setDraft] = useState(goal.progress)   // live slider value
  const [confirming, setConfirming] = useState(false)
  const [, start] = useTransition()
  const committed = useRef(goal.progress)

  // Re-sync when the parent's authoritative value changes (e.g. status snap).
  useEffect(() => { setDraft(goal.progress); committed.current = goal.progress }, [goal.progress])

  const meta = goal.competency ? COMPETENCY_META[goal.competency] : null
  const fill = meta?.color ?? BRAND
  const status = STATUS_META[goal.status]
  const overdue = goal.due_at && goal.status === 'active' && new Date(goal.due_at) < new Date()
  const muted = goal.status === 'dropped'

  function commitProgress(next: number) {
    if (next === committed.current) return
    committed.current = next
    const prev = goal
    onChanged({ ...goal, progress: next })   // optimistic
    start(async () => {
      const r = await setGoalProgress(goal.id, next)
      if (!r.success) { onChanged(prev); setDraft(prev.progress); toast(r.error, 'error') }
      else onChanged(r.goal)
    })
  }

  function changeStatus(next: GoalStatus) {
    if (next === goal.status) return
    const prev = goal
    const optimistic = { ...goal, status: next, progress: next === 'achieved' ? 100 : goal.progress }
    onChanged(optimistic)
    if (next === 'achieved') setDraft(100)
    start(async () => {
      const r = await setGoalStatus(goal.id, next)
      if (!r.success) { onChanged(prev); setDraft(prev.progress); toast(r.error, 'error') }
      else onChanged(r.goal)
    })
  }

  return (
    <div className={cn('rounded-[16px] border border-border bg-card p-4 [animation:slideUp_.3s_ease_both]', muted && 'opacity-70')}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn('text-[14px] font-medium leading-snug', muted && 'line-through')}>{goal.title}</h3>
            {meta && (
              <span className="rounded-[20px] px-1.5 py-px text-[10px] font-mono" style={{ background: `${meta.color}1A`, color: meta.color }}>
                {meta.label}
              </span>
            )}
          </div>
          {goal.target && (
            <p className="mt-1 flex items-start gap-1.5 text-[12px] text-muted-foreground">
              <i className="ti ti-ruler-measure mt-px text-[12px]" aria-hidden="true" />
              {goal.target}
            </p>
          )}
        </div>

        {/* Kebab menu */}
        <div className="relative shrink-0">
          {!confirming ? (
            <Menu onEdit={() => onEdit(goal)} onDelete={() => setConfirming(true)} />
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-popover px-2 py-1 text-[11px]">
              <span className="text-muted-foreground">Delete?{wins.length > 0 && ` ${wins.length} win${wins.length > 1 ? 's' : ''} stay`}</span>
              <button onClick={() => { setConfirming(false); onDelete(goal) }} className="font-medium text-[#993C1D]">Yes</button>
              <button onClick={() => setConfirming(false)} className="text-muted-foreground">No</button>
            </div>
          )}
        </div>
      </div>

      {/* Progress meter */}
      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={draft}
          disabled={muted}
          aria-label="Progress"
          onChange={e => setDraft(Number(e.target.value))}
          onPointerUp={() => commitProgress(draft)}
          onKeyUp={() => commitProgress(draft)}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted disabled:cursor-not-allowed [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
          style={{ background: `linear-gradient(to right, ${fill} ${draft}%, var(--muted) ${draft}%)` }}
        />
        <span className="w-[42px] shrink-0 text-right font-mono text-[13px]" style={{ color: fill }}>{draft}%</span>
      </div>

      {/* Status + due */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          {STATUS_ORDER.map(s => {
            const sm = STATUS_META[s]
            const on = goal.status === s
            return (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                aria-pressed={on}
                className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors', !on && 'text-muted-foreground hover:text-foreground')}
                style={on ? { background: sm.bg, color: sm.color } : undefined}
              >
                {sm.label}
              </button>
            )
          })}
        </div>
        {goal.due_at && (
          <span className={cn('ml-auto flex items-center gap-1 font-mono text-[11px]', overdue ? 'text-[#993C1D]' : 'text-muted-foreground')}>
            <i className="ti ti-calendar-event text-[12px]" aria-hidden="true" />
            due {fmtDue(goal.due_at)}
          </span>
        )}
      </div>

      {/* Evidence (attached wins) */}
      <div className="mt-3 border-t border-black/[.06] pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {wins.map(w => (
            <WinItem key={w.id} win={w} compact onEdit={onEditWin} onDelete={onDeleteWin} busy={winBusyIds?.has(w.id)} />
          ))}
          <button
            onClick={() => onAddWin(goal.id)}
            className="inline-flex items-center gap-1 rounded-[20px] border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <i className="ti ti-plus text-[12px]" aria-hidden="true" />
            {wins.length === 0 ? 'Add a win' : 'Win'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Menu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} aria-label="Goal actions" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
        <i className="ti ti-dots text-[16px]" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[120px] rounded-lg border border-border bg-popover py-1 shadow-lg">
            <button onClick={() => { setOpen(false); onEdit() }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-muted">
              <i className="ti ti-pencil text-[13px]" aria-hidden="true" /> Edit
            </button>
            <button onClick={() => { setOpen(false); onDelete() }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#993C1D] hover:bg-muted">
              <i className="ti ti-trash text-[13px]" aria-hidden="true" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
