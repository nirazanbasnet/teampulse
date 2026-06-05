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

  // The team's workspace — needed so we can also grant workspace membership.
  const { data: team } = await supabase
    .from('teams')
    .select('workspace_id')
    .eq('id', teamId)
    .single()

  if (!team) throw new Error('Team not found.')

  // A person must be a workspace member to satisfy RLS on teams/notes (i.e.
  // to actually see the board). Adding them to a team implies workspace
  // membership, so ensure it exists first. No-op if they're already a member.
  const { error: wsError } = await supabase
    .from('workspace_members')
    .upsert(
      { workspace_id: team.workspace_id, profile_id: profileId, role: 'member', invited_by: user.id },
      { onConflict: 'workspace_id,profile_id', ignoreDuplicates: true },
    )

  if (wsError) throw new Error(`Failed to add to workspace: ${wsError.message}`)

  const { error } = await supabase
    .from('team_members')
    .upsert(
      { team_id: teamId, profile_id: profileId, added_by: user.id },
      { onConflict: 'team_id,profile_id', ignoreDuplicates: true },
    )

  if (error) throw new Error(`Failed to add member: ${error.message}`)
  revalidatePath('/admin/teams')
  return { success: true }
}

export async function setTeamRole(
  { teamId, profileId, role }: { teamId: string; profileId: string; role: 'lead' | 'member' },
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // RLS: only a workspace admin or a lead of this team may update.
  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('profile_id', profileId)

  if (error) throw new Error(`Failed to update role: ${error.message}`)
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
