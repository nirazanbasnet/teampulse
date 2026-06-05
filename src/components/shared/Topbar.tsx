// src/components/shared/Topbar.tsx
'use client'

import Link               from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState }       from 'react'
import { Avatar }         from './Avatar'
import { createBrowserClient } from '@/lib/supabase/browser'
import { cn } from '@/lib/utils'
import type { Profile, Team, FeedbackCycle } from '@/lib/types'

interface TopbarProps {
  profile:   Profile
  team?:     Team
  cycle?:    FeedbackCycle | null
  isAdmin?:  boolean
  /** All teams the current user belongs to — drives the team switcher. */
  teams?:    { id: string; name: string }[]
}

export function Topbar({ profile, team, cycle, isAdmin, teams = [] }: TopbarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [signingOut,   setSigningOut]   = useState(false)

  const navItems = team ? [
    { href: `/board/${team.id}`,     label: 'Board',     icon: 'ti-layout-kanban' },
    { href: `/analytics/${team.id}`, label: 'Analytics', icon: 'ti-chart-bar'     },
    ...(isAdmin ? [{ href: `/admin/teams`, label: 'Admin', icon: 'ti-settings' }] : []),
  ] : []

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const otherTeams = teams.filter(t => t.id !== team?.id)

  return (
    <header className="flex items-center gap-3 px-[16px] h-[48px] border-b border-border bg-background sticky top-0 z-30">
      {/* Brand */}
      <Link href="/" className="no-underline flex items-center gap-[7px]">
        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
        <span className="text-[14px] font-medium text-foreground tracking-[-0.02em]">
          TeamPulse
        </span>
      </Link>

      {/* Team name + switcher */}
      {team && (
        <>
          <div className="w-px h-4 bg-border" />
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen(v => !v)}
              className="flex items-center gap-[5px] text-[13px] text-foreground font-medium px-[8px] py-[4px] rounded-md hover:bg-muted transition-colors"
            >
              <i className="ti ti-users-group text-[14px] text-muted-foreground" aria-hidden="true" />
              {team.name}
              {teams.length > 1 && (
                <i className={cn('ti ti-chevron-down text-[13px] text-muted-foreground transition-transform', switcherOpen && 'rotate-180')} aria-hidden="true" />
              )}
            </button>

            {switcherOpen && teams.length > 1 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-popover shadow-lg py-1">
                  <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Switch team</div>
                  {teams.map(t => (
                    <Link
                      key={t.id}
                      href={`/board/${t.id}`}
                      onClick={() => setSwitcherOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-[13px] no-underline hover:bg-muted',
                        t.id === team.id ? 'text-foreground font-medium' : 'text-muted-foreground',
                      )}
                    >
                      <i className={cn('ti text-[14px]', t.id === team.id ? 'ti-circle-check text-primary' : 'ti-circle')} aria-hidden="true" />
                      {t.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Nav */}
      {navItems.length > 0 && (
        <nav className="flex gap-[2px] ml-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-[5px] px-[10px] py-[5px] rounded-lg text-[12px] no-underline transition-all duration-150',
                  active
                    ? 'font-medium text-foreground bg-muted'
                    : 'font-normal text-muted-foreground bg-transparent hover:text-foreground',
                )}
              >
                <i className={`ti ${item.icon} text-[14px]`} aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-[10px]">
        {cycle && (
          <span className={cn(
            'flex items-center gap-[5px] px-[10px] py-[3px] rounded-[20px] text-[11px] font-mono',
            cycle.status === 'active'
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted text-muted-foreground'
          )}>
            <span className={cn(
              'w-[5px] h-[5px] rounded-full inline-block',
              cycle.status === 'active' ? 'bg-primary' : 'bg-border'
            )} />
            {cycle.name}
          </span>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-[30px] h-[30px] rounded-full overflow-hidden cursor-pointer border border-border block"
            aria-label="Account menu"
          >
            <Avatar name={profile.full_name} size={30} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[220px] rounded-lg border border-border bg-popover shadow-lg py-1">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-[13px] font-medium text-foreground truncate">{profile.full_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{profile.email}</div>
                </div>
                {isAdmin && (
                  <Link
                    href="/admin/teams"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground no-underline hover:bg-muted hover:text-foreground"
                  >
                    <i className="ti ti-settings text-[14px]" aria-hidden="true" />
                    Team management
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#A32D2D] hover:bg-muted text-left"
                >
                  <i className="ti ti-logout text-[14px]" aria-hidden="true" />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
