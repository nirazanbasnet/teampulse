// src/components/goals/WinComposer.tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CompetencyPicker } from './CompetencyPicker'
import { useToast } from '@/components/shared/ToastProvider'
import { createWin, updateWin } from '@/server/actions/wins'
import type { Goal, Win, NoteTag } from '@/lib/types'

interface WinComposerProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  teamId:        string
  cycleId:       string | null
  goals:         Goal[]          // current-cycle goals, for the "evidence toward" picker
  defaultGoalId?: string | null  // seeded when opened from a goal's "+ add win"
  win?:          Win | null      // present → edit mode
  onSaved:       (win: Win) => void
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10)
}

export function WinComposer({
  open, onOpenChange, teamId, cycleId, goals, defaultGoalId, win, onSaved,
}: WinComposerProps) {
  const { toast } = useToast()
  const editing = !!win
  const [title, setTitle]           = useState('')
  const [detail, setDetail]         = useState('')
  const [competency, setCompetency] = useState<NoteTag | null>(null)
  const [happenedAt, setHappenedAt] = useState(todayInput())
  const [goalId, setGoalId]         = useState<string>('')
  const [error, setError]           = useState('')
  const [saving, start]             = useTransition()

  useEffect(() => {
    if (!open) return
    setError('')
    if (win) {
      setTitle(win.title)
      setDetail(win.detail ?? '')
      setCompetency(win.competency)
      setHappenedAt(win.happened_at)
      setGoalId(win.goal_id ?? '')
    } else {
      setTitle('')
      setDetail('')
      setHappenedAt(todayInput())
      const seedGoal = defaultGoalId ?? ''
      setGoalId(seedGoal)
      // Default the competency to the linked goal's axis to nudge alignment.
      const g = seedGoal ? goals.find(x => x.id === seedGoal) : null
      setCompetency(g?.competency ?? null)
    }
  }, [open, win, defaultGoalId, goals])

  function onPickGoal(next: string) {
    setGoalId(next)
    // When attaching to a goal and no competency is set yet, inherit it.
    if (next && !competency) {
      const g = goals.find(x => x.id === next)
      if (g?.competency) setCompetency(g.competency)
    }
  }

  function handleSubmit() {
    if (saving) return
    if (title.trim().length < 1) { setError('Describe what you accomplished.'); return }
    setError('')

    start(async () => {
      const result = editing
        ? await updateWin({
            id: win!.id, title, detail, competency, happened_at: happenedAt, goal_id: goalId || null,
          })
        : await createWin({
            team_id: teamId, cycle_id: cycleId, goal_id: goalId || null,
            title, detail, competency, happened_at: happenedAt,
          })

      if (!result.success) { setError(result.error); return }
      onSaved(result.win)
      toast(editing ? 'Win updated' : 'Win logged')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!saving) onOpenChange(o) }}>
      <DialogContent
        className="max-w-[460px]"
        onEscapeKeyDown={e => { if (saving) e.preventDefault() }}
        onInteractOutside={e => { if (saving) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit win' : 'Log a win'}</DialogTitle>
          <DialogDescription>Bank an accomplishment — name the behaviour and its impact.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          <Field label="What you did">
            <Input
              value={title}
              onChange={e => { setTitle(e.target.value); if (error) setError('') }}
              placeholder="e.g. Shipped the ALATA migration, cut deploy time 40%"
              maxLength={160}
              autoFocus
            />
          </Field>

          <Field label="Details" hint="optional">
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Impact, who it helped, the numbers…"
              maxLength={1000}
              rows={2}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>

          <Field label="Competency" hint="optional">
            <CompetencyPicker value={competency} onChange={setCompetency} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="When">
              <Input type="date" value={happenedAt} max={todayInput()} onChange={e => setHappenedAt(e.target.value)} />
            </Field>
            <Field label="Evidence toward" hint="optional">
              <select
                value={goalId}
                onChange={e => onPickGoal(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">No goal</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </Field>
          </div>

          {error && <p className="rounded bg-[#FAECE7] px-2.5 py-1.5 text-[12px] text-[#993C1D]">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || title.trim().length < 1}>
            {saving ? (<><i className="ti ti-loader-2 animate-spin" aria-hidden="true" /> Saving…</>) : (editing ? 'Save win' : 'Log win')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
        {hint && <span className="font-normal normal-case tracking-normal text-muted-foreground/70">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
