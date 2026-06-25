// src/server/actions/teams.ts
'use server'

import { revalidatePath }      from 'next/cache'
import { createServerClient }  from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Authorize a team-membership management action and return the team's
// workspace_id. The caller must be a workspace admin of the team's
// workspace OR a lead of the team itself — the same rule the RLS
// policies encode. We verify it here (service role) so the privileged
// write below can't be blocked by policy drift on team_members.
async function assertCanManageTeam(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  teamId: string,
): Promise<string> {
  const { data: team } = await service
    .from('teams')
    .select('workspace_id')
    .eq('id', teamId)
    .single()
  if (!team) throw new Error('Team not found.')

  const [{ data: adminRow }, { data: leadRow }] = await Promise.all([
    service.from('workspace_members').select('id')
      .eq('workspace_id', team.workspace_id)
      .eq('profile_id', userId)
      .eq('role', 'admin')
      .maybeSingle(),
    service.from('team_members').select('id')
      .eq('team_id', teamId)
      .eq('profile_id', userId)
      .eq('role', 'lead')
      .maybeSingle(),
  ])

  if (!adminRow && !leadRow) {
    throw new Error("You must be a workspace admin or this team's lead to manage its members.")
  }
  return team.workspace_id as string
}

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

  const service     = createServiceClient()
  const workspaceId = await assertCanManageTeam(service, user.id, teamId)

  // A person must be a workspace member to satisfy RLS on teams/notes (i.e.
  // to actually see the board). Adding them to a team implies workspace
  // membership, so ensure it exists first. No-op if they're already a member.
  const { error: wsError } = await service
    .from('workspace_members')
    .upsert(
      { workspace_id: workspaceId, profile_id: profileId, role: 'member', invited_by: user.id },
      { onConflict: 'workspace_id,profile_id', ignoreDuplicates: true },
    )

  if (wsError) throw new Error(`Failed to add to workspace: ${wsError.message}`)

  const { error } = await service
    .from('team_members')
    .upsert(
      { team_id: teamId, profile_id: profileId, added_by: user.id },
      { onConflict: 'team_id,profile_id', ignoreDuplicates: true },
    )

  if (error) throw new Error(`Failed to add member: ${error.message}`)
  // No revalidatePath here — TeamBuilder updates its roster optimistically,
  // so we avoid an RSC refresh that would reset the selected team / scroll.
  return { success: true }
}

export async function setTeamRole(
  { teamId, profileId, role }: { teamId: string; profileId: string; role: 'lead' | 'member' },
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const service = createServiceClient()
  await assertCanManageTeam(service, user.id, teamId)

  const { error } = await service
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('profile_id', profileId)

  if (error) throw new Error(`Failed to update role: ${error.message}`)
  // Optimistic UI in TeamBuilder — skip the refresh (see addTeamMember).
  return { success: true }
}

// Remove a person from the WHOLE workspace: their workspace membership and
// every team in it. Their account, login, and past feedback are untouched —
// this just revokes access (re-add them anytime). Workspace-admin only.
export async function removeWorkspaceMember(
  { workspaceId, profileId }: { workspaceId: string; profileId: string },
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (profileId === user.id) throw new Error("You can't remove yourself from the workspace.")

  const service = createServiceClient()

  // Caller must be an admin of this workspace.
  const { data: adminRow } = await service
    .from('workspace_members').select('id')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()
  if (!adminRow) throw new Error('You must be a workspace admin to remove members.')

  // Don't let an admin remove another admin (demote them first).
  const { data: targetRow } = await service
    .from('workspace_members').select('role')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (targetRow?.role === 'admin') {
    throw new Error("That person is a workspace admin — remove their admin role first.")
  }

  // Drop them from every team in this workspace, then the workspace itself.
  const { data: teamRows } = await service
    .from('teams').select('id').eq('workspace_id', workspaceId)
  const teamIds = (teamRows ?? []).map((t: any) => t.id)
  if (teamIds.length) {
    const { error: tmError } = await service
      .from('team_members').delete()
      .eq('profile_id', profileId)
      .in('team_id', teamIds)
    if (tmError) throw new Error(`Failed to remove from teams: ${tmError.message}`)
  }

  const { error } = await service
    .from('workspace_members').delete()
    .eq('workspace_id', workspaceId)
    .eq('profile_id', profileId)
  if (error) throw new Error(`Failed to remove from workspace: ${error.message}`)

  // Optimistic UI in TeamBuilder — skip the refresh (see addTeamMember).
  return { success: true }
}

// Permanently delete a user account. Removes their auth login, which cascades
// (profiles → workspace_members, team_members, notes, …) so every trace of
// them is gone, in ALL workspaces. Irreversible. Workspace-admin only; can't
// delete yourself or anyone who is an admin of any workspace.
export async function deleteUserAccount(
  { workspaceId, profileId }: { workspaceId: string; profileId: string },
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (profileId === user.id) throw new Error("You can't delete your own account.")

  const service = createServiceClient()

  // Caller must be an admin of this workspace.
  const { data: adminRow } = await service
    .from('workspace_members').select('id')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()
  if (!adminRow) throw new Error('You must be a workspace admin to delete accounts.')

  // Never delete another admin (of any workspace) — demote them first.
  const { data: targetAdmin } = await service
    .from('workspace_members').select('id')
    .eq('profile_id', profileId)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle()
  if (targetAdmin) {
    throw new Error("That person is a workspace admin — remove their admin role before deleting them.")
  }

  // Delete the auth user; the profiles FK cascade removes everything else.
  const { error } = await service.auth.admin.deleteUser(profileId)
  if (error) throw new Error(`Failed to delete account: ${error.message}`)

  return { success: true }
}

export async function removeTeamMember({ teamId, profileId }: { teamId: string; profileId: string }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const service = createServiceClient()
  await assertCanManageTeam(service, user.id, teamId)

  const { error } = await service
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('profile_id', profileId)

  if (error) throw new Error(`Failed to remove member: ${error.message}`)
  // Optimistic UI in TeamBuilder — skip the refresh (see addTeamMember).
  return { success: true }
}
