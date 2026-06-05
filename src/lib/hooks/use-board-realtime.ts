// ============================================================
// TeamPulse — Realtime Board Hook
// src/lib/hooks/use-board-realtime.ts
//
// Subscribes to notes table changes for a given team via
// Supabase Realtime postgres_changes. Updates local board
// state optimistically without a full refetch.
// ============================================================

'use client'

import { useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { NoteSafe } from '@/lib/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type NoteChangeCallback = (
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  note: Partial<NoteSafe> & { id: string }
) => void

interface UseBoardRealtimeOptions {
  teamId:   string
  onNoteChange: NoteChangeCallback
}

export function useBoardRealtime({ teamId, onNoteChange }: UseBoardRealtimeOptions) {
  const supabase = createBrowserClient()

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const event = payload.eventType

      if (event === 'DELETE') {
        const old = payload.old as { id: string }
        onNoteChange('DELETE', { id: old.id })
        return
      }

      const record = (event === 'INSERT' ? payload.new : payload.new) as Record<string, unknown>

      // The realtime payload comes from the base notes table,
      // which includes author_id. We MUST strip it here before
      // passing to UI state — never allow it into React state.
      const safe = { ...(record as Record<string, unknown>) }
      const rawCreatedAt = safe.created_at as string | undefined
      // SECURITY: author_id must never enter React state.
      delete safe.author_id
      delete safe.created_at

      onNoteChange(event, {
        ...safe,
        created_at: (safe.created_at_display as string | undefined) ?? rawCreatedAt,
        // is_mine and can_mark_done must be set by the receiver
        // based on their own user ID — not from the payload
      } as Partial<NoteSafe> & { id: string })
    },
    [onNoteChange]
  )

  useEffect(() => {
    const channel = supabase
      .channel(`board:${teamId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'notes',
          filter: `team_id=eq.${teamId}`,
        },
        handleChange
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, supabase, handleChange])
}
