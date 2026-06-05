// src/app/auth/login/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { createBrowserClient }     from '@/lib/supabase/browser'
import { useRouter }               from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { cn }     from '@/lib/utils'

export default function LoginPage() {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [mode,      setMode]      = useState<'signin' | 'signup'>('signin')
  const [message,   setMessage]   = useState('')
  const [error,     setError]     = useState('')
  const [isPending, startTransition] = useTransition()
  const router  = useRouter()
  const supabase = createBrowserClient()

  function handleSubmit() {
    if (!email.trim() || !password.trim()) return
    setError('')
    setMessage('')
    startTransition(async () => {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) { setError(error.message); return }
        if (data.session) router.push('/')
        else setMessage('Account created. Check your email to confirm, then sign in.')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) setError(error.message)
      else router.push('/')
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-tertiary p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-base font-medium tracking-tight">TeamPulse</span>
        </div>

        <h1 className="mb-1 text-lg font-medium">
          {mode === 'signup' ? 'Create your account' : 'Sign in'}
        </h1>
        <p className="mb-5 text-[13px] text-muted-foreground">
          Give and receive anonymous feedback with your team.
        </p>

        {/* Mode toggle */}
        <div className="mb-4 flex overflow-hidden rounded-lg border border-border">
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setMessage('') }}
              className={cn(
                'flex-1 py-1.5 text-xs transition-colors',
                mode === m
                  ? 'bg-foreground font-medium text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Choose a password (min 6 chars)' : 'Password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isPending || !email.trim() || !password.trim()}
            className="mt-1 w-full"
          >
            {isPending
              ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
              : (mode === 'signup' ? 'Create account' : 'Sign in')}
          </Button>
        </div>

        {message && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#5DCAA5] bg-accent px-3 py-2.5 text-[13px] text-accent-foreground">
            <i className="ti ti-mail text-sm" aria-hidden="true" />
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-[#F7C1C1] bg-[#FCEBEB] px-3 py-2.5 text-[13px] text-[#A32D2D]">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
