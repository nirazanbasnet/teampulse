'use client'

import { useState }            from 'react'
import { useRouter }           from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/browser'
import { cn }                  from '@/lib/utils'

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signOut() {
    setLoading(true)
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <button
      onClick={signOut}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors',
        className,
      )}
    >
      <i className="ti ti-logout text-base" aria-hidden="true" />
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
