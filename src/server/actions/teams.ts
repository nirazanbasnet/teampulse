// src/server/actions/teams.ts
'use server'

import { revalidatePath }     from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

export async function createTeam({ workspaceId, name }: { workspaceId: string; name: string }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { error } = await supabase.from('teams').insert({
    workspace_id: workspaceId,
    name,
    created_by:  user.id,
  })

  if (error) throw new Error(`Failed to create team: ${error.message}`)
  revalidatePath('/admin/teams')
  return { success: true }
}

export async function updateTeam({ teamId, name }: { teamId: string; name: string }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('teams')
    .update({ name })
    .eq('id', teamId)

  if (error) throw new Error(`Failed to update team: ${error.message}`)
  revalidatePath('/admin/teams')
  return { success: true }
}

export async function deleteTeam({ teamId }: { teamId: string }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) throw new Error(`Failed to delete team: ${error.message}`)
  revalidatePath('/admin/teams')
  return { success: true }
}

export async function addTeamMember({ teamId, profileId }: { teamId: string; profileId: string }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('team_members').insert({
    team_id:    teamId,
    profile_id: profileId,
    added_by:   user.id,
  })

  if (error) throw new Error(`Failed to add member: ${error.message}`)
  revalidatePath('/admin/teams')
  return { success: true }
}

export async function removeTeamMember({ teamId, profileId }: { teamId: string; profileId: string }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('profile_id', profileId)

  if (error) throw new Error(`Failed to remove member: ${error.message}`)
  revalidatePath('/admin/teams')
  return { success: true }
}

export async function inviteMember({
  workspaceId, teamId, email,
}: {
  workspaceId: string; teamId: string; email: string
}) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      workspace_id: workspaceId,
      team_id:      teamId,
      email:        email.toLowerCase().trim(),
      invited_by:   user.id,
    })
    .select('token')
    .single()

  if (error) throw new Error(`Failed to create invite: ${error.message}`)

  // In production: send email via Resend/SendGrid with invite link
  // For now: console.log the link for development
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${invite.token}`
  console.log('[TeamPulse] Invite link:', inviteUrl)

  return { success: true, inviteUrl }
}
