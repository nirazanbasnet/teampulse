// src/app/admin/cycles/page.tsx
import { redirect }           from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { CycleManager }       from '@/components/admin/CycleManager'

export default async function AdminCyclesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Admins manage cycles for every team; team leads can open cycles for the
  // teams they lead (closing stays admin-only).
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name)')
    .eq('profile_id', user.id)
  const adminMembership = (memberships ?? []).find((m: any) => m.role === 'admin')
  const anyMembership = adminMembership ?? (memberships ?? [])[0]
  if (!anyMembership) redirect('/')
  const workspace = (anyMembership as any).workspaces
  const isAdmin = !!adminMembership

  const { data: ledRows } = await supabase
    .from('team_members').select('team_id').eq('profile_id', user.id).eq('role', 'lead')
  const ledTeamIds = new Set((ledRows ?? []).map((r: any) => r.team_id))

  if (!isAdmin && ledTeamIds.size === 0) redirect('/')

  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('workspace_id', workspace.id)

  // Admins see all teams; leads only the teams they lead.
  const teams = isAdmin ? (allTeams ?? []) : (allTeams ?? []).filter((t: any) => ledTeamIds.has(t.id))

  const { data: cycles } = await supabase
    .from('feedback_cycles')
    .select('*, teams(name)')
    .in('team_id', teams.map((t: any) => t.id))
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-[700px] px-4 py-6">
      <div className="mb-6 flex items-center gap-2.5">
        <h1 className="text-[20px] font-medium m-0">Feedback cycles</h1>
        {!isAdmin && (
          <span className="text-[11px] px-2 py-0.5 rounded-[20px] bg-[#FAEEDA] text-[#854F0B] border border-[#F5E0B8]">
            Team lead
          </span>
        )}
      </div>
      <CycleManager
        teams={teams}
        cycles={cycles ?? []}
      />
    </div>
  )
}
