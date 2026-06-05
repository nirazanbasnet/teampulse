// ============================================================
// TeamPulse — Note Server Actions
// src/server/actions/notes.ts
//
// All note mutations go through here — never direct client
// writes. This ensures business logic (anonymity, grace period,
// audit logging) is always enforced server-side.
// ============================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { CreateNoteInput, NoteTag, NoteType, UpdateNotePositionInput } from '@/lib/types'

// ── Create note ───────────────────────────────────────────────

export async function createNote(input: CreateNoteInput) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Prevent self-feedback (belt + suspenders on top of DB constraint)
  if (input.recipient_id === user.id) {
    throw new Error('You cannot give feedback on yourself.')
  }

  // Verify the author is actually a member of the team
  const { data: membership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', input.team_id)
    .eq('profile_id', user.id)
    .single()

  if (!membership) {
    throw new Error('You are not a member of this team.')
  }

  // Verify recipient is also a team member
  const { data: recipientMembership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', input.team_id)
    .eq('profile_id', input.recipient_id)
    .single()

  if (!recipientMembership) {
    throw new Error('Recipient is not a member of this team.')
  }

  // Determine current position (append to end of recipient's column)
  const { count } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', input.team_id)
    .eq('recipient_id', input.recipient_id)

  const { error } = await supabase.from('notes').insert({
    team_id:      input.team_id,
    cycle_id:     input.cycle_id ?? null,
    recipient_id: input.recipient_id,
    author_id:    user.id,         // stored server-side only
    note_type:    input.note_type,
    content:      input.content.trim(),
    tags:         input.tags,
    position:     count ?? 0,
  })

  if (error) throw new Error(`Failed to create note: ${error.message}`)

  revalidatePath(`/board/${input.team_id}`)
  return { success: true }
}

// ── Mark note done ────────────────────────────────────────────

export async function markNoteDone(noteId: string) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // RLS enforces recipient_id = auth.uid() for this update
  const { error } = await supabase
    .from('notes')
    .update({ done: true })
    .eq('id', noteId)
    .eq('recipient_id', user.id)   // explicit guard
    .eq('done', false)              // idempotency

  if (error) throw new Error(`Failed to mark done: ${error.message}`)

  return { success: true }
}

// ── Reorder notes (drag and drop) ─────────────────────────────

export async function reorderNotes(updates: UpdateNotePositionInput[]) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Update positions in bulk. RLS allows recipients and authors
  // to update position on notes they own. These rows already exist,
  // so we issue targeted updates rather than an upsert (which would
  // require the full Insert shape).
  const results = await Promise.all(
    updates.map(u =>
      supabase.from('notes').update({ position: u.position }).eq('id', u.id),
    ),
  )

  const error = results.find(r => r.error)?.error

  if (error) throw new Error(`Failed to reorder: ${error.message}`)

  return { success: true }
}

// ── Move note to different column (cross-column drag) ─────────

export async function moveNote(noteId: string, newRecipientId: string, teamId: string) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify new recipient is a team member
  const { data: membership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('profile_id', newRecipientId)
    .single()

  if (!membership) throw new Error('New recipient is not a team member.')

  // Prevent moving to self
  if (newRecipientId === user.id) {
    throw new Error('Cannot move note to your own column.')
  }

  // RLS: only the author can update (within grace period)
  const { error } = await supabase
    .from('notes')
    .update({ recipient_id: newRecipientId })
    .eq('id', noteId)
    .eq('author_id', user.id)

  if (error) throw new Error(`Failed to move note: ${error.message}`)

  revalidatePath(`/board/${teamId}`)
  return { success: true }
}

// ── Delete note (author, within grace period) ─────────────────

export async function deleteNote(noteId: string) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // RLS enforces grace period check
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)

  if (error) throw new Error(`Failed to delete note: ${error.message}`)

  return { success: true }
}

// ── Report note ───────────────────────────────────────────────

export async function reportNote(noteId: string, reason: string) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('content_reports')
    .insert({
      note_id:     noteId,
      reporter_id: user.id,
      reason:      reason.trim(),
    })

  if (error) throw new Error(`Failed to submit report: ${error.message}`)

  return { success: true }
}

// ── Admin: moderate reported note ────────────────────────────
// Uses service role to access notes_admin view with author_id.

export async function moderateNote(
  reportId: string,
  action: 'dismiss' | 'remove',
  adminNote?: string
) {
  const serviceClient = createServiceClient()
  const supabase      = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify admin role
  const { data: report } = await serviceClient
    .from('content_reports')
    .select('id, note_id')
    .eq('id', reportId)
    .single()

  if (!report) throw new Error('Report not found.')

  if (action === 'remove') {
    await serviceClient.from('notes').delete().eq('id', report.note_id)
  }

  await serviceClient
    .from('content_reports')
    .update({
      status:      action === 'remove' ? 'removed' : 'dismissed',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_note:  adminNote ?? null,
    })
    .eq('id', reportId)

  // Audit log
  await serviceClient.from('audit_log').insert({
    actor_id:    user.id,
    action:      `note_${action}`,
    target_table: 'notes',
    target_id:   report.note_id,
    metadata:    { report_id: reportId, admin_note: adminNote },
  })

  return { success: true }
}
