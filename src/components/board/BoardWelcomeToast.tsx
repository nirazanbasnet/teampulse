'use client'

// Shows a one-time welcome toast when a user lands on the board right after
// being added to a team (via ?joined=1 from TeamJoinWatcher), then cleans
// the query param out of the URL.

import { useEffect, useRef } from 'react'
import { useRouter }         from 'next/navigation'
import { useToast }          from '@/components/shared/ToastProvider'

export function BoardWelcomeToast({ joined, teamName }: { joined: boolean; teamName: string }) {
  const { toast } = useToast()
  const router    = useRouter()
  const shown     = useRef(false)

  useEffect(() => {
    if (!joined || shown.current) return
    shown.current = true
    toast(`You're in! Welcome to ${teamName} — leave anonymous feedback on your teammates.`, 'success')
    // Drop the ?joined=1 so a refresh doesn't re-toast.
    router.replace(window.location.pathname)
  }, [joined, teamName, toast, router])

  return null
}
