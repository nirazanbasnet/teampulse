// ============================================================
// TeamPulse — Win Server Actions
// src/server/actions/wins.ts
//
// Personal accomplishments ("brag list") — private to the author,
// cycle-scoped, optionally attached to a goal as evidence. Owner-guarded
// on top of the RLS in 011_goals_and_wins.sql. Expected user-facing
// failures are RETURNED (Next.js redacts thrown Server Action messages
// in production); unexpected DB errors are thrown.
// ============================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { CreateWinInput, UpdateWinInput, Win } from '@/lib/types'

export type WinActionResult =
  | { success: true; win: Win }
  | { success: false; error: string }

const TITLE_MAX = 160

// ── Create ────────────────────────────────────────────────────

export async function createWin(input: CreateWinInput): Promise<WinActionResult> {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const title = input.title.trim()
  if (title.length < 1) return { success: false, error: 'Describe what you accomplished.' }
  if (title.length > TITLE_MAX) return { success: false, error: `Keep it under ${TITLE_MAX} characters.` }

  const member = await isMember(supabase, input.team_id, user.id)
  if (!member) return { success: false, error: 'You are not a member of this team.' }

  // If attaching to a goal, it must be the user's own goal. Inherit the
  // goal's cycle when the caller didn't pass one, so evidence stays on the
  // same cycle as the goal it supports.
  let cycleId = input.cycle_id ?? null
  if (input.goal_id) {
    const { data: goal } = await supabase
      .from('goals')
      .select('id, cycle_id')
      .eq('id', input.goal_id)
      .eq('profile_id', user.id)
      .maybeSingle()
    if (!goal) return { success: false, error: "That goal isn't yours." }
    if (!cycleId) cycleId = goal.cycle_id
  }

  const { data, error } = await supabase
    .from('wins')
    .insert({
      team_id:     input.team_id,
      cycle_id:    cycleId,
      profile_id:  user.id,
      goal_id:     input.goal_id ?? null,
      title,
      detail:      input.detail?.trim() || null,
      competency:  input.competency ?? null,
      happened_at: input.happened_at ?? today(),
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to log win: ${error.message}`)

  revalidatePath(`/goals/${input.team_id}`)
  return { success: true, win: data as Win }
}

// ── Update (partial) ──────────────────────────────────────────

export async function updateWin(input: UpdateWinInput): Promise<WinActionResult> {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const patch: Record<string, unknown> = {}

  if (input.title !== undefined) {
    const title = input.title.trim()
    if (title.length < 1) return { success: false, error: 'Describe what you accomplished.' }
    if (title.length > TITLE_MAX) return { success: false, error: `Keep it under ${TITLE_MAX} characters.` }
    patch.title = title
  }
  if (input.detail !== undefined)      patch.detail = input.detail?.trim() || null
  if (input.competency !== undefined)  patch.competency = input.competency ?? null
  if (input.happened_at !== undefined) patch.happened_at = input.happened_at

  if (input.goal_id !== undefined) {
    if (input.goal_id) {
      const { data: goal } = await supabase
        .from('goals')
        .select('id')
        .eq('id', input.goal_id)
        .eq('profile_id', user.id)
        .maybeSingle()
      if (!goal) return { success: false, error: "That goal isn't yours." }
    }
    patch.goal_id = input.goal_id ?? null
  }

  if (Object.keys(patch).length === 0) {
    return { success: false, error: 'Nothing to update.' }
  }

  const { data, error } = await supabase
    .from('wins')
    .update(patch)
    .eq('id', input.id)
    .eq('profile_id', user.id)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update win: ${error.message}`)
  if (!data) return { success: false, error: 'Win not found.' }

  revalidatePath(`/goals/${(data as Win).team_id}`)
  return { success: true, win: data as Win }
}

// ── Delete ────────────────────────────────────────────────────

export async function deleteWin(
  winId: string,
  teamId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('wins')
    .delete()
    .eq('id', winId)
    .eq('profile_id', user.id)

  if (error) throw new Error(`Failed to delete win: ${error.message}`)

  revalidatePath(`/goals/${teamId}`)
  return { success: true }
}

// ── helpers ───────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
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
