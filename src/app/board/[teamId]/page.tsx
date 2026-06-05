// ============================================================
// TeamPulse — Board Page (Server Component)
// src/app/board/[teamId]/page.tsx
//
// Loads initial board state server-side via Supabase.
// Passes data to the client-side BoardView for interactivity.
// ============================================================

import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { BoardView } from '@/components/board/BoardView'
import type { BoardState } from '@/lib/types'

interface BoardPageProps {
  params: { teamId: string }
}

export default async function BoardPage({ params }: BoardPageProps) {
  const supabase = createServerClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { teamId } = params

  // Load team + member list
  const { data: team } = await supabase
    .from('teams')
    .select(`
      *,
      team_members (
        id,
        profile_id,
        added_at,
        profiles!team_members_profile_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      )
    `)
    .eq('id', teamId)
    .single()

  if (!team) notFound()

  // Verify current user is a team member
  const isMember = team.team_members.some(
    (m: any) => m.profile_id === user.id
  )
  if (!isMember) notFound()

  // Load active cycle (if any)
  const { data: cycle } = await supabase
    .from('feedback_cycles')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Load notes via the safe view (author_id excluded by RLS)
  const { data: notes } = await supabase
    .from('notes_safe')
    .select('*')
    .eq('team_id', teamId)
    .order('position', { ascending: true })

  // Load reaction counts
  const noteIds = (notes ?? []).map((n: any) => n.id)
  const { data: reactions } = noteIds.length
    ? await supabase
        .from('note_reaction_counts')
        .select('*')
        .in('note_id', noteIds)
    : { data: [] }

  // Attach reactions to notes
  const notesWithReactions = (notes ?? []).map((note: any) => ({
    ...note,
    reactions: (reactions ?? []).filter((r: any) => r.note_id === note.id),
  }))

  // Build board columns per team member
  const columns = team.team_members
    .sort((a: any, b: any) => {
      // Current user's column first
      if (a.profile_id === user.id) return -1
      if (b.profile_id === user.id) return 1
      return a.profiles.full_name.localeCompare(b.profiles.full_name)
    })
    .map((member: any) => ({
      member: {
        ...member,
        profile: member.profiles,
      },
      notes: notesWithReactions.filter(
        (n: any) => n.recipient_id === member.profile_id
      ),
      isMyColumn: member.profile_id === user.id,
    }))

  const boardState: BoardState = {
    team:    team as any,
    cycle:   cycle ?? null,
    columns,
  }

  return (
    <BoardView
      boardState={boardState}
      currentUserId={user.id}
    />
  )
}

// ISR — revalidate every 30s as fallback (Realtime handles live updates)
export const revalidate = 30
