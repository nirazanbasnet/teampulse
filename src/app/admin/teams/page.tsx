// src/app/admin/teams/page.tsx
import { redirect }        from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { TeamBuilder }     from '@/components/admin/TeamBuilder'
import { createTeam, updateTeam, deleteTeam } from '@/server/actions/teams'

export default async function AdminTeamsPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Load workspaces where user is admin
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, slug)')
    .eq('profile_id', user.id)
    .eq('role', 'admin')

  if (!memberships || memberships.length === 0) {
    redirect('/auth/login')
  }

  const workspace = (memberships[0].workspaces as any)

  // Load all teams in this workspace
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      *,
      team_members(
        id,
        profile_id,
        added_at,
        profiles!team_members_profile_id_fkey(id, full_name, email, avatar_url)
      )
    `)
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: true })

  // Candidate pool = every registered user. Adding one to a team also makes
  // them a workspace member (see addTeamMember), so there's no separate
  // "add to workspace" step. RLS lets any authenticated user read profiles.
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
      </div>

      <TeamBuilder
        workspaceId={workspace.id}
        teams={teams ?? []}
        candidates={(allProfiles ?? []).map((p: any) => ({
          profile_id: p.id,
          profile:    p,
        }))}
      />
    </div>
  )
}
