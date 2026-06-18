// src/app/report/[teamId]/page.tsx
// Private individual Growth Report — competency scorecard + AI report.
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Topbar }            from '@/components/shared/Topbar'
import { GrowthReport }      from '@/components/report/GrowthReport'
import { computeGrowthScores } from '@/lib/growth/score'
import type { NoteSafe } from '@/lib/types'

interface ReportPageProps {
  params:       { teamId: string }
  searchParams: { cycle?: string }
}

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
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

  // Cycles → pick active (or the requested one).
  const { data: cycles } = await supabase
    .from('feedback_cycles')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  const activeCycleId = searchParams.cycle
    ?? cycles?.find((c: any) => c.status === 'active')?.id
    ?? cycles?.[0]?.id
    ?? null

  // My received notes for this cycle.
  let notesQuery = supabase
    .from('notes_safe')
    .select('*')
    .eq('team_id', teamId)
    .eq('recipient_id', user.id)
  if (activeCycleId) notesQuery = notesQuery.eq('cycle_id', activeCycleId)
  const { data: notes } = await notesQuery

  // Attach vote counts so the scorecard reflects peer agreement.
  const noteIds = (notes ?? []).map((n: any) => n.id)
  const { data: reactions } = noteIds.length
    ? await supabase.from('note_reaction_counts').select('*').in('note_id', noteIds)
    : { data: [] }

  const received: NoteSafe[] = (notes ?? []).map((n: any) => ({
    ...n,
    reactions: (reactions ?? []).filter((r: any) => r.note_id === n.id),
  }))

  const scores = computeGrowthScores(received)

  // Topbar context.
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: myTeamRows } = await supabase
    .from('team_members').select('teams(id, name)').eq('profile_id', user.id)
  const userTeams = (myTeamRows ?? []).map((r: any) => r.teams).filter(Boolean) as { id: string; name: string }[]

  const { data: adminRow } = await supabase
    .from('workspace_members').select('id').eq('profile_id', user.id).eq('role', 'admin').limit(1).maybeSingle()
  const activeCycle = (cycles ?? []).find((c: any) => c.status === 'active') ?? null

  const generatedOn = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div>
      <div className="print:hidden">
        <Topbar
          profile={profile as any}
          team={team as any}
          cycle={activeCycle as any}
          isAdmin={!!adminRow}
          teams={userTeams}
        />
      </div>
      <GrowthReport
        name={(profile as any)?.full_name ?? 'You'}
        teamName={team.name}
        teamId={teamId}
        cycles={cycles ?? []}
        activeCycleId={activeCycleId}
        scores={scores}
        generatedOn={generatedOn}
      />
    </div>
  )
}
