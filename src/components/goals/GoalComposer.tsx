// src/components/goals/GoalComposer.tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CompetencyPicker } from './CompetencyPicker'
import { useToast } from '@/components/shared/ToastProvider'
import { createGoal, updateGoal } from '@/server/actions/goals'
import type { Goal, NoteTag } from '@/lib/types'

interface GoalComposerProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  teamId:       string
  cycleId:      string | null
  cycleEndsAt:  string | null   // pre-fills the due date for a new goal
  goal?:        Goal | null     // present → edit mode
  onSaved:      (goal: Goal) => void
}

// yyyy-mm-dd for <input type="date"> from an ISO timestamp.
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

export function GoalComposer({
  open, onOpenChange, teamId, cycleId, cycleEndsAt, goal, onSaved,
}: GoalComposerProps) {
  const { toast } = useToast()
  const editing = !!goal
  const [title, setTitle]           = useState('')
  const [detail, setDetail]         = useState('')
  const [competency, setCompetency] = useState<NoteTag | null>(null)
  const [target, setTarget]         = useState('')
  const [due, setDue]               = useState('')
  const [error, setError]           = useState('')
  const [saving, start]             = useTransition()

  // Seed fields whenever the dialog opens (new vs edit).
  useEffect(() => {
    if (!open) return
    setError('')
    if (goal) {
      setTitle(goal.title)
      setDetail(goal.detail ?? '')
      setCompetency(goal.competency)
      setTarget(goal.target ?? '')
      setDue(toDateInput(goal.due_at))
    } else {
      setTitle('')
      setDetail('')
      setCompetency(null)
      setTarget('')
      setDue(toDateInput(cycleEndsAt))
    }
  }, [open, goal, cycleEndsAt])

  function handleSubmit() {
    if (saving) return
    if (title.trim().length < 1) { setError('Give your goal a title.'); return }
    setError('')
    const dueAt = due ? new Date(due).toISOString() : null

    start(async () => {
      const result = editing
        ? await updateGoal({
            id: goal!.id, title, detail, competency, target, due_at: dueAt,
          })
        : await createGoal({
            team_id: teamId, cycle_id: cycleId, title, detail, competency, target, due_at: dueAt,
          })

      if (!result.success) { setError(result.error); return }
      onSaved(result.goal)
      toast(editing ? 'Goal updated' : 'Goal added')
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
          <DialogTitle>{editing ? 'Edit goal' : 'New goal'}</DialogTitle>
          <DialogDescription>What do you want to achieve this cycle — and how will you know you did?</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          <Field label="Goal">
            <Input
              value={title}
              onChange={e => { setTitle(e.target.value); if (error) setError('') }}
              placeholder="e.g. Lead the search re-index project"
              maxLength={120}
              autoFocus
            />
          </Field>

          <Field label="How it's measured" hint="optional">
            <Input
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="e.g. Cut p95 query time to under 200ms"
              maxLength={200}
            />
          </Field>

          <Field label="Competency" hint="optional">
            <CompetencyPicker value={competency} onChange={setCompetency} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Notes" hint="optional">
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="Context, why it matters…"
                maxLength={1000}
                rows={2}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
            <Field label="Due">
              <Input type="date" value={due} onChange={e => setDue(e.target.value)} />
            </Field>
          </div>

          {error && <p className="rounded bg-[#FAECE7] px-2.5 py-1.5 text-[12px] text-[#993C1D]">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || title.trim().length < 1}>
            {saving ? (<><i className="ti ti-loader-2 animate-spin" aria-hidden="true" /> Saving…</>) : (editing ? 'Save goal' : 'Add goal')}
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
