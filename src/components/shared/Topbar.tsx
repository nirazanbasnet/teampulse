// src/components/shared/Topbar.tsx
'use client'

import Link       from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar } from './Avatar'
import { cn } from '@/lib/utils'
import type { Profile, Team, FeedbackCycle } from '@/lib/types'

interface TopbarProps {
  profile:      Profile
  team?:        Team
  cycle?:       FeedbackCycle | null
  isAdmin?:     boolean
}

export function Topbar({ profile, team, cycle, isAdmin }: TopbarProps) {
  const pathname = usePathname()

  const navItems = team ? [
    { href: `/board/${team.id}`,     label: 'Board',     icon: 'ti-layout-kanban' },
    { href: `/analytics/${team.id}`, label: 'Analytics', icon: 'ti-chart-bar'     },
    ...(isAdmin ? [{ href: `/admin/teams`, label: 'Admin', icon: 'ti-settings' }] : []),
  ] : []

  return (
    <header className="flex items-center gap-3 px-[16px] h-[48px] border-b border-border bg-background sticky top-0 z-30">
      {/* Brand */}
      <Link href="/" className="no-underline flex items-center gap-[7px]">
        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
        <span className="text-[14px] font-medium text-foreground tracking-[-0.02em]">
          TeamPulse
        </span>
      </Link>

      {team && (
        <>
          <div className="w-px h-4 bg-border" />
          <span className="text-[13px] text-muted-foreground">
            {team.name}
          </span>
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
                  'flex items-center gap-[5px] px-[10px] py-[5px] rounded-lg text-[12px] no-underline transition-all duration-[150ms]',
                  active
                    ? 'font-medium text-foreground bg-muted'
                    : 'font-normal text-muted-foreground bg-transparent'
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
        <div className="w-[30px] h-[30px] rounded-full overflow-hidden cursor-pointer border border-border">
          <Avatar name={profile.full_name} size={30} />
        </div>
      </div>
    </header>
  )
}
