'use client'

// Watches for the current user being added to a team while they sit on the
// "not on any team yet" screen. The moment an admin / lead adds them, they
// get a toast and are sent straight to their new board — no manual refresh.
//
// Primary path: Supabase Realtime (instant) on team_members inserts for this
// user. Fallback: a poll every 10s, so it still works even if the
// team_members table isn't in the realtime publication.

import { useEffect, useRef } from 'react'
import { useRouter }         from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { useToast }          from '@/components/shared/ToastProvider'

export function TeamJoinWatcher({ userId }: { userId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const joinedRef = useRef(false)

  useEffect(() => {
    const supabase = createBrowserClient()

    function handleJoined(teamId: string) {
      if (joinedRef.current || !teamId) return
      joinedRef.current = true
      toast("You've been added to a team — opening your board…", 'success')
      setTimeout(() => {
        router.push(`/board/${teamId}?joined=1`)
        router.refresh()
      }, 1000)
    }

    // Primary: realtime insert on team_members for this user.
    const channel = supabase
      .channel(`team-join:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'team_members',
          filter: `profile_id=eq.${userId}`,
        },
        payload => handleJoined((payload.new as { team_id?: string })?.team_id ?? ''),
      )
      .subscribe()

    // Fallback: poll for membership in case realtime isn't enabled.
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', userId)
        .order('added_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (data?.team_id) handleJoined(data.team_id)
    }, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [userId, router, toast])

  return null
}
