// ============================================================
// TeamPulse — Cycle pulse (goals + wins summary)
// src/lib/growth/goals.ts
//
// Turns a person's goals and wins for a cycle into the measurable
// numbers behind the "cycle pulse" header. Pure + deterministic, like
// score.ts — the same figures render on the page and can later feed the
// AI report or analytics.
// ============================================================

import { COMPETENCIES } from './score'
import type { Goal, Win, NoteTag } from '@/lib/types'

export interface CompetencyCoverage {
  key:     NoteTag
  goals:   number    // goals tagged to this competency
  wins:    number    // wins tagged to this competency
  covered: boolean   // at least one goal OR win touches it
}

export interface CyclePulse {
  goalCount:     number
  activeGoals:   number
  achievedGoals: number
  missedGoals:   number
  droppedGoals:  number
  // Mean progress across non-dropped goals (0–100), null when there are
  // none — so the header shows "—" rather than a misleading 0%.
  avgProgress:   number | null
  winCount:      number
  winsLinked:    number          // wins attached to a goal (evidence)
  coverage:      CompetencyCoverage[]  // one per COMPETENCIES entry (length 5)
  coveredCount:  number          // how many of the 5 competencies are covered
}

export function summarizeCycle(goals: Goal[], wins: Win[]): CyclePulse {
  const activeGoals   = goals.filter(g => g.status === 'active').length
  const achievedGoals = goals.filter(g => g.status === 'achieved').length
  const missedGoals   = goals.filter(g => g.status === 'missed').length
  const droppedGoals  = goals.filter(g => g.status === 'dropped').length

  // Dropped goals are abandoned intent — exclude them so they don't drag
  // the average down.
  const counted = goals.filter(g => g.status !== 'dropped')
  const avgProgress = counted.length
    ? Math.round(counted.reduce((sum, g) => sum + g.progress, 0) / counted.length)
    : null

  const coverage: CompetencyCoverage[] = COMPETENCIES.map(key => {
    const g = goals.filter(x => x.competency === key).length
    const w = wins.filter(x => x.competency === key).length
    return { key, goals: g, wins: w, covered: g + w > 0 }
  })

  return {
    goalCount:     goals.length,
    activeGoals,
    achievedGoals,
    missedGoals,
    droppedGoals,
    avgProgress,
    winCount:      wins.length,
    winsLinked:    wins.filter(w => w.goal_id !== null).length,
    coverage,
    coveredCount:  coverage.filter(c => c.covered).length,
  }
}

// Wins logged as evidence toward a specific goal (newest first).
export function winsForGoal(goalId: string, wins: Win[]): Win[] {
  return wins
    .filter(w => w.goal_id === goalId)
    .sort((a, b) => (a.happened_at < b.happened_at ? 1 : -1))
}
