// ============================================================
// TeamPulse — Goal Server Actions
// src/server/actions/goals.ts
//
// Personal, cycle-scoped goals — private to the author. Every mutation
// is owner-guarded (.eq('profile_id', user.id)) on top of the RLS
// policies in 011_goals_and_wins.sql.
//
// Expected, user-facing failures are RETURNED as values, not thrown:
// Next.js redacts Error messages thrown from Server Actions in
// production, so a validation message would never reach the client.
// (Same pattern as createNote in ./notes.ts.) Unexpected DB errors are
// thrown.
// ============================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { CreateGoalInput, UpdateGoalInput, Goal, GoalStatus } from '@/lib/types'

export type GoalActionResult =
  | { success: true; goal: Goal }
  | { success: false; error: string }

const TITLE_MAX = 120

// ── Create ────────────────────────────────────────────────────

export async function createGoal(input: CreateGoalInput): Promise<GoalActionResult> {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const title = input.title.trim()
  if (title.length < 1) return { success: false, error: 'Give your goal a title.' }
  if (title.length > TITLE_MAX) return { success: false, error: `Keep the title under ${TITLE_MAX} characters.` }

  const member = await isMember(supabase, input.team_id, user.id)
  if (!member) return { success: false, error: 'You are not a member of this team.' }

  // Default the due date to the cycle's end when the caller didn't set one.
  let dueAt = input.due_at ?? null
  if (!dueAt && input.cycle_id) {
    const { data: cycle } = await supabase
      .from('feedback_cycles')
      .select('ends_at')
      .eq('id', input.cycle_id)
      .single()
    dueAt = cycle?.ends_at ?? null
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      team_id:    input.team_id,
      cycle_id:   input.cycle_id ?? null,
      profile_id: user.id,
      title,
      detail:     input.detail?.trim() || null,
      competency: input.competency ?? null,
      target:     input.target?.trim() || null,
      progress:   0,
      status:     'active',
      due_at:     dueAt,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create goal: ${error.message}`)

  revalidatePath(`/goals/${input.team_id}`)
  return { success: true, goal: data as Goal }
}

// ── Update (partial) ──────────────────────────────────────────

export async function updateGoal(input: UpdateGoalInput): Promise<GoalActionResult> {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const patch: Record<string, unknown> = {}

  if (input.title !== undefined) {
    const title = input.title.trim()
    if (title.length < 1) return { success: false, error: 'Give your goal a title.' }
    if (title.length > TITLE_MAX) return { success: false, error: `Keep the title under ${TITLE_MAX} characters.` }
    patch.title = title
  }
  if (input.detail !== undefined)     patch.detail = input.detail?.trim() || null
  if (input.competency !== undefined) patch.competency = input.competency ?? null
  if (input.target !== undefined)     patch.target = input.target?.trim() || null
  if (input.due_at !== undefined)     patch.due_at = input.due_at ?? null

  if (input.progress !== undefined) {
    if (!Number.isFinite(input.progress)) return { success: false, error: 'Progress must be a number.' }
    patch.progress = clampProgress(input.progress)
  }
  if (input.status !== undefined) {
    patch.status = input.status
    // Marking a goal achieved snaps the meter to 100 unless the caller is
    // explicitly setting a different progress in the same update.
    if (input.status === 'achieved' && input.progress === undefined) patch.progress = 100
  }

  if (Object.keys(patch).length === 0) {
    return { success: false, error: 'Nothing to update.' }
  }

  const { data, error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', input.id)
    .eq('profile_id', user.id)   // owner guard (RLS also enforces)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update goal: ${error.message}`)
  if (!data) return { success: false, error: 'Goal not found.' }

  revalidatePath(`/goals/${(data as Goal).team_id}`)
  return { success: true, goal: data as Goal }
}

// ── Convenience wrappers (inline meter + status control) ──────

export async function setGoalProgress(goalId: string, progress: number): Promise<GoalActionResult> {
  return updateGoal({ id: goalId, progress: clampProgress(progress) })
}

export async function setGoalStatus(goalId: string, status: GoalStatus): Promise<GoalActionResult> {
  return updateGoal({ id: goalId, status })
}

// ── Delete ────────────────────────────────────────────────────
// Wins attached to this goal survive — the FK is ON DELETE SET NULL, so
// they detach into standalone accomplishments rather than being removed.

export async function deleteGoal(
  goalId: string,
  teamId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('profile_id', user.id)

  if (error) throw new Error(`Failed to delete goal: ${error.message}`)

  revalidatePath(`/goals/${teamId}`)
  return { success: true }
}

// ── helpers ───────────────────────────────────────────────────

function clampProgress(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

async function isMember(
  supabase: ReturnType<typeof createServerClient>,
  teamId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('profile_id', userId)
    .maybeSingle()
  return !!data
}
