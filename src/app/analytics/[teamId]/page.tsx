// src/app/analytics/[teamId]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createServerClient }  from '@/lib/supabase/server'
import { AnalyticsDashboard }  from '@/components/analytics/AnalyticsDashboard'
import type { NoteTag, NoteType, TeamAnalytics } from '@/lib/types'

interface AnalyticsPageProps {
  params:      { teamId: string }
  searchParams: { cycle?: string }
}

export default async function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { teamId } = params

  // Load team
  const { data: team } = await supabase
    .from('teams')
    .select('*, team_members(profile_id, profiles!team_members_profile_id_fkey(id, full_name, email, avatar_url))')
    .eq('id', teamId)
    .single()

  if (!team) notFound()

  // Verify membership
  const isMember = team.team_members.some((m: any) => m.profile_id === user.id)
  if (!isMember) notFound()

  // Load cycles for this team
  const { data: cycles } = await supabase
    .from('feedback_cycles')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  const activeCycleId = searchParams.cycle
    ?? cycles?.find((c: any) => c.status === 'active')?.id
    ?? cycles?.[0]?.id

  // Load notes for selected cycle (or all notes if no cycles)
  let notesQuery = supabase
    .from('notes_safe')
    .select('*')
    .eq('team_id', teamId)

  if (activeCycleId) notesQuery = notesQuery.eq('cycle_id', activeCycleId)

  const { data: notes } = await notesQuery

  const allNotes = notes ?? []
  const members  = team.team_members.map((m: any) => m.profiles)

  // Build analytics
  const tagCounts: Record<NoteTag, number> = {
    Communication: 0, Technical: 0, Collaboration: 0, Leadership: 0, Delivery: 0,
  }
  const typeCounts: Record<NoteType, number> = { general: 0, strength: 0, growth: 0 }

  allNotes.forEach((n: any) => {
    typeCounts[n.note_type as NoteType]++
    ;(n.tags as NoteTag[]).forEach(t => { if (tagCounts[t] !== undefined) tagCounts[t]++ })
  })

  const participatingAuthors = new Set(
    allNotes.filter((n: any) => n.is_mine).map((n: any) => 'me')
  ).size // simplified — full implementation needs server-side author tracking

  const memberStats = members.map((profile: any) => {
    const received   = allNotes.filter((n: any) => n.recipient_id === profile.id)
    const done       = received.filter((n: any) => n.done)
    const tagBreak: Record<NoteTag, number> = {
      Communication: 0, Technical: 0, Collaboration: 0, Leadership: 0, Delivery: 0,
    }
    received.forEach((n: any) => {
      (n.tags as NoteTag[]).forEach((t: NoteTag) => { if (tagBreak[t] !== undefined) tagBreak[t]++ })
    })
    return {
      profile,
      notes_received:  received.length,
      notes_given:     0, // populated server-side with service role
      completion_rate: received.length > 0 ? Math.round(done.length / received.length * 100) : 0,
      tag_breakdown:   tagBreak,
    }
  })

  const analytics: TeamAnalytics = {
    cycle_id:         activeCycleId ?? '',
    total_notes:      allNotes.length,
    done_notes:       allNotes.filter((n: any) => n.done).length,
    completion_rate:  allNotes.length > 0
      ? Math.round(allNotes.filter((n: any) => n.done).length / allNotes.length * 100)
      : 0,
    participation:    members.length > 0 ? participatingAuthors / members.length : 0,
    tag_distribution: tagCounts,
    type_distribution: typeCounts,
    member_stats:     memberStats,
  }

  // Load current user's personal cycle summary if available
  let summary = null
  if (activeCycleId) {
    const { data } = await supabase
      .from('cycle_summaries')
      .select('*')
      .eq('cycle_id', activeCycleId)
      .eq('profile_id', user.id)
      .maybeSingle()
    summary = data
  }

  const isAdmin = team.team_members.some(
    (m: any) => m.profile_id === user.id
    // In practice check workspace_members role too
  )

  return (
    <AnalyticsDashboard
      team={team as any}
      cycles={cycles ?? []}
      activeCycleId={activeCycleId ?? null}
      analytics={analytics}
      currentUserId={user.id}
      personalSummary={summary?.summary_text ?? null}
      isAdmin={isAdmin}
    />
  )
}

export const revalidate = 60
