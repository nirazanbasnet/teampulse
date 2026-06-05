// src/app/admin/teams/page.tsx
import { redirect }        from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { TeamBuilder }     from '@/components/admin/TeamBuilder'

export default async function AdminTeamsPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // The user's workspace memberships (prefer the one where they're admin).
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, slug)')
    .eq('profile_id', user.id)

  const adminMembership = (memberships ?? []).find((m: any) => m.role === 'admin')
  const anyMembership   = adminMembership ?? (memberships ?? [])[0]
  if (!anyMembership) redirect('/')

  const workspace  = (anyMembership as any).workspaces
  const isWsAdmin  = !!adminMembership

  // Teams the user LEADS (team-level role).
  const { data: ledRows } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('profile_id', user.id)
    .eq('role', 'lead')
  const ledTeamIds = new Set((ledRows ?? []).map((r: any) => r.team_id))

  // All teams in the workspace (RLS lets any member read them).
  const { data: allTeams } = await supabase
    .from('teams')
    .select(`
      *,
      team_members(
        id,
        profile_id,
        role,
        added_at,
        profiles!team_members_profile_id_fkey(id, full_name, email, avatar_url)
      )
    `)
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: true })

  // Admins manage every team; leads manage only the teams they lead.
  const teams = isWsAdmin
    ? (allTeams ?? [])
    : (allTeams ?? []).filter((t: any) => ledTeamIds.has(t.id))

  if (!isWsAdmin && teams.length === 0) redirect('/')

  // Workspace admins (to render the "Admin" badge on members).
  const { data: wsAdmins } = await supabase
    .from('workspace_members')
    .select('profile_id')
    .eq('workspace_id', workspace.id)
    .eq('role', 'admin')
  const adminProfileIds = (wsAdmins ?? []).map((r: any) => r.profile_id)

  // Candidate pool = every registered user.
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .order('full_name', { ascending: true })

  return (
    <div className="mx-auto max-w-[800px] px-4 py-6">
      <div className="flex items-center gap-[10px] mb-6">
        <h1 className="text-[20px] font-medium m-0">Team management</h1>
        <span className="text-[12px] px-2 py-0.5 rounded-[20px] bg-muted border border-border text-muted-foreground">
          {workspace.name}
        </span>
        {!isWsAdmin && (
          <span className="text-[11px] px-2 py-0.5 rounded-[20px] bg-[#FAEEDA] text-[#854F0B] border border-[#F5E0B8]">
            Team lead
          </span>
        )}
      </div>

      <TeamBuilder
        workspaceId={workspace.id}
        teams={teams}
        canCreateTeams={isWsAdmin}
        adminProfileIds={adminProfileIds}
        candidates={(allProfiles ?? []).map((p: any) => ({
          profile_id: p.id,
          profile:    p,
        }))}
      />
    </div>
  )
}
