// src/app/goals/[teamId]/page.tsx
// Personal Goals & Wins — measurable, cycle-scoped, private to you.
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Topbar }      from '@/components/shared/Topbar'
import { GoalsView }   from '@/components/goals/GoalsView'
import { summarizeCycle } from '@/lib/growth/goals'
import type { Goal, Win } from '@/lib/types'

interface GoalsPageProps {
  params:       { teamId: string }
  searchParams: { cycle?: string }
}

export default async function GoalsPage({ params, searchParams }: GoalsPageProps) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { teamId } = params

  const { data: team } = await supabase
    .from('teams')
    .select('*, team_members(profile_id)')
    .eq('id', teamId)
    .single()
  if (!team) notFound()

  const isMember = (team.team_members as any[]).some(m => m.profile_id === user.id)
  if (!isMember) notFound()

  // Cycles → pick the requested one, else the active one, else the latest.
  const { data: cycles } = await supabase
    .from('feedback_cycles')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  const activeCycleId = searchParams.cycle
    ?? cycles?.find((c: any) => c.status === 'active')?.id
    ?? cycles?.[0]?.id
    ?? null

  // My goals + wins for this cycle (owner-scoped by RLS; explicit too).
  let goalsQuery = supabase
    .from('goals')
    .select('*')
    .eq('team_id', teamId)
    .eq('profile_id', user.id)
    .order('created_at', { ascending: true })
  if (activeCycleId) goalsQuery = goalsQuery.eq('cycle_id', activeCycleId)

  let winsQuery = supabase
    .from('wins')
    .select('*')
    .eq('team_id', teamId)
    .eq('profile_id', user.id)
    .order('happened_at', { ascending: false })
  if (activeCycleId) winsQuery = winsQuery.eq('cycle_id', activeCycleId)

  const [{ data: goals }, { data: wins }] = await Promise.all([goalsQuery, winsQuery])

  const goalList = (goals ?? []) as Goal[]
  const winList  = (wins ?? []) as Win[]
  const pulse    = summarizeCycle(goalList, winList)

  // Topbar context.
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: myTeamRows } = await supabase
    .from('team_members').select('teams(id, name)').eq('profile_id', user.id)
  const userTeams = (myTeamRows ?? []).map((r: any) => r.teams).filter(Boolean) as { id: string; name: string }[]

  const { data: adminRow } = await supabase
    .from('workspace_members').select('id')
    .eq('workspace_id', (team as any).workspace_id)
    .eq('profile_id', user.id).eq('role', 'admin').maybeSingle()

  const activeCycle = (cycles ?? []).find((c: any) => c.id === activeCycleId) ?? null

  return (
    <div>
      <Topbar
        profile={profile as any}
        team={team as any}
        cycle={activeCycle as any}
        isAdmin={!!adminRow}
        teams={userTeams}
      />
      <GoalsView
        name={(profile as any)?.full_name ?? 'You'}
        teamName={team.name}
        teamId={teamId}
        cycles={cycles ?? []}
        activeCycleId={activeCycleId}
        activeCycle={activeCycle as any}
        goals={goalList}
        wins={winList}
        pulse={pulse}
      />
    </div>
  )
}
