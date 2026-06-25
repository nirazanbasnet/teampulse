// src/components/goals/GoalsView.tsx
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CyclePulseHeader } from './CyclePulseHeader'
import { GoalCard } from './GoalCard'
import { GoalComposer } from './GoalComposer'
import { WinComposer } from './WinComposer'
import { WinList } from './WinList'
import { useToast } from '@/components/shared/ToastProvider'
import { deleteGoal } from '@/server/actions/goals'
import { deleteWin } from '@/server/actions/wins'
import { summarizeCycle, winsForGoal, type CyclePulse } from '@/lib/growth/goals'
import type { FeedbackCycle, Goal, Win } from '@/lib/types'
import { cn } from '@/lib/utils'

interface GoalsViewProps {
  name:          string
  teamName:      string
  teamId:        string
  cycles:        FeedbackCycle[]
  activeCycleId: string | null
  activeCycle:   FeedbackCycle | null
  goals:         Goal[]
  wins:          Win[]
  pulse:         CyclePulse   // server-computed; recomputed locally on mutation
}

export function GoalsView({
  name, teamName, teamId, cycles, activeCycleId, activeCycle, goals: initialGoals, wins: initialWins,
}: GoalsViewProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [goals, setGoals] = useState(initialGoals)
  const [wins, setWins]   = useState(initialWins)
  useEffect(() => { setGoals(initialGoals) }, [initialGoals])
  useEffect(() => { setWins(initialWins) }, [initialWins])

  const [goalOpen, setGoalOpen]     = useState(false)
  const [editGoal, setEditGoal]     = useState<Goal | null>(null)
  const [winOpen, setWinOpen]       = useState(false)
  const [editWin, setEditWin]       = useState<Win | null>(null)
  const [winGoalSeed, setWinGoalSeed] = useState<string | null>(null)
  const [busyWins, setBusyWins]     = useState<Set<string>>(new Set())
  const [, start] = useTransition()

  const pulse = useMemo(() => summarizeCycle(goals, wins), [goals, wins])
  const cycleName = activeCycle?.name ?? cycles.find(c => c.id === activeCycleId)?.name ?? null
  const unlinkedWins = wins.filter(w => w.goal_id === null)

  // ── Goal handlers ───────────────────────────────────────────
  function openNewGoal()        { setEditGoal(null); setGoalOpen(true) }
  function openEditGoal(g: Goal) { setEditGoal(g); setGoalOpen(true) }

  function onGoalSaved(saved: Goal) {
    setGoals(prev => prev.some(g => g.id === saved.id)
      ? prev.map(g => (g.id === saved.id ? saved : g))
      : [...prev, saved])
  }
  function onGoalChanged(updated: Goal) {
    setGoals(prev => prev.map(g => (g.id === updated.id ? updated : g)))
  }
  function onDeleteGoal(goal: Goal) {
    const prevGoals = goals
    const prevWins = wins
    setGoals(prev => prev.filter(g => g.id !== goal.id))
    // Attached wins survive, detached (matches ON DELETE SET NULL).
    setWins(prev => prev.map(w => (w.goal_id === goal.id ? { ...w, goal_id: null } : w)))
    start(async () => {
      const r = await deleteGoal(goal.id, teamId)
      if (!r.success) { setGoals(prevGoals); setWins(prevWins); toast(r.error, 'error') }
      else toast('Goal deleted')
    })
  }

  // ── Win handlers ────────────────────────────────────────────
  function openNewWin(goalId: string | null) { setEditWin(null); setWinGoalSeed(goalId); setWinOpen(true) }
  function openEditWin(w: Win)                { setEditWin(w); setWinGoalSeed(null); setWinOpen(true) }

  function onWinSaved(saved: Win) {
    setWins(prev => prev.some(w => w.id === saved.id)
      ? prev.map(w => (w.id === saved.id ? saved : w))
      : [saved, ...prev])
  }
  function onDeleteWin(win: Win) {
    setBusyWins(prev => new Set(prev).add(win.id))
    const prevWins = wins
    setWins(prev => prev.filter(w => w.id !== win.id))
    start(async () => {
      const r = await deleteWin(win.id, teamId)
      if (!r.success) { setWins(prevWins); toast(r.error, 'error') }
      setBusyWins(prev => { const n = new Set(prev); n.delete(win.id); return n })
    })
  }

  const noCycles = cycles.length === 0

  return (
    <div className="mx-auto max-w-[860px] px-4 py-6">
      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {cycles.map(c => (
            <button
              key={c.id}
              onClick={() => router.push(`/goals/${teamId}?cycle=${c.id}`)}
              className={cn(
                'rounded-[20px] px-3 py-1 text-xs font-mono',
                c.id === activeCycleId
                  ? 'border-[1.5px] border-primary bg-accent text-accent-foreground'
                  : 'border border-border bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {c.name}
              {c.status === 'active' && <span className="ml-1.5 inline-block h-[5px] w-[5px] rounded-full bg-primary align-middle" />}
            </button>
          ))}
        </div>
      )}

      <CyclePulseHeader pulse={pulse} name={name} teamName={teamName} cycleName={cycleName} />

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={openNewGoal}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-white hover:opacity-90"
        >
          <i className="ti ti-target text-[15px]" aria-hidden="true" /> Add goal
        </button>
        <button
          onClick={() => openNewWin(null)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground hover:bg-muted"
        >
          <i className="ti ti-trophy text-[15px] text-[#B8860B]" aria-hidden="true" /> Log a win
        </button>
      </div>

      {/* Goals */}
      <section className="mt-5">
        <h2 className="mb-2.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Goals <span className="font-mono">{goals.length > 0 && `· ${goals.length}`}</span>
        </h2>
        {goals.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-border bg-card p-8 text-center">
            <i className="ti ti-target text-[26px] text-primary/40" aria-hidden="true" />
            <p className="mx-auto mt-2.5 max-w-sm text-[13px] text-muted-foreground">
              No goals {cycleName ? `for ${cycleName}` : 'yet'}. Set a measurable target — tag a competency so it lands on the same axes as your feedback.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                wins={winsForGoal(goal.id, wins)}
                onChanged={onGoalChanged}
                onEdit={openEditGoal}
                onDelete={onDeleteGoal}
                onAddWin={id => openNewWin(id)}
                onEditWin={openEditWin}
                onDeleteWin={onDeleteWin}
                winBusyIds={busyWins}
              />
            ))}
          </div>
        )}
      </section>

      {/* Standalone wins (not tied to a goal) */}
      <section className="mt-6">
        <h2 className="mb-2.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Wins <span className="font-mono">{unlinkedWins.length > 0 && `· ${unlinkedWins.length}`}</span>
        </h2>
        <WinList
          wins={unlinkedWins}
          goals={goals}
          onEdit={openEditWin}
          onDelete={onDeleteWin}
          busyIds={busyWins}
          emptyLabel={pulse.winCount > 0 ? 'All your wins are linked to goals. Nice.' : 'No wins logged yet — log one when you ship something.'}
        />
      </section>

      {/* Composers */}
      <GoalComposer
        open={goalOpen}
        onOpenChange={setGoalOpen}
        teamId={teamId}
        cycleId={activeCycleId}
        cycleEndsAt={activeCycle?.ends_at ?? null}
        goal={editGoal}
        onSaved={onGoalSaved}
      />
      <WinComposer
        open={winOpen}
        onOpenChange={setWinOpen}
        teamId={teamId}
        cycleId={activeCycleId}
        goals={goals}
        defaultGoalId={winGoalSeed}
        win={editWin}
        onSaved={onWinSaved}
      />

      {noCycles && (
        <p className="mt-4 text-center text-[11px] text-muted-foreground/70">
          No feedback cycle is open — goals and wins you add now aren&apos;t tied to a cycle, and will show under &ldquo;No active cycle&rdquo;.
        </p>
      )}
    </div>
  )
}
