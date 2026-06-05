'use client'

import Link               from 'next/link'
import { usePathname }    from 'next/navigation'
import { cn }             from '@/lib/utils'

// Sub-navigation across the admin sections. Team management + Activity are
// available to team leads too; Cycles + Moderation are admin-only.
export function AdminNav({ isAdmin, isLead }: { isAdmin: boolean; isLead: boolean }) {
  const pathname = usePathname()
  if (!isAdmin && !isLead) return null

  const items = [
    { href: '/admin/teams',      label: 'Teams',      icon: 'ti-users-group',  show: isAdmin || isLead },
    { href: '/admin/activity',   label: 'Activity',   icon: 'ti-history',      show: isAdmin || isLead },
    { href: '/admin/cycles',     label: 'Cycles',     icon: 'ti-clock-hour-4', show: isAdmin },
    { href: '/admin/moderation', label: 'Moderation', icon: 'ti-shield',       show: isAdmin },
  ].filter(i => i.show)

  return (
    <div className="border-b border-border bg-background">
      <nav className="mx-auto max-w-[820px] px-4 flex gap-1 overflow-x-auto">
        {items.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-[6px] px-3 py-[10px] text-[13px] no-underline whitespace-nowrap border-b-2 -mb-px transition-colors',
                active
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <i className={`ti ${item.icon} text-[15px]`} aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
