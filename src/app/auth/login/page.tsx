// src/app/auth/login/page.tsx
'use client'

import { useState }            from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [error,         setError]         = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const supabase = createBrowserClient()

  async function handleGoogle() {
    setError('')
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    // On success the browser is redirected to Google, so we only reach here on error.
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-tertiary p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-base font-medium tracking-tight">TeamPulse</span>
        </div>

        <h1 className="mb-1 text-lg font-medium">Sign in</h1>
        <p className="mb-5 text-[13px] text-muted-foreground">
          Give and receive anonymous feedback with your team.
        </p>

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full"
        >
          <i className="ti ti-brand-google text-base" aria-hidden="true" />
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </Button>

        {error && (
          <div className="mt-4 rounded-lg border border-[#F7C1C1] bg-[#FCEBEB] px-3 py-2.5 text-[13px] text-[#A32D2D]">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
