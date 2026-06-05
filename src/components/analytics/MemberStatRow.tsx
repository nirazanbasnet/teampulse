// src/components/analytics/MemberStatRow.tsx
'use client'

import { Avatar }        from '@/components/shared/Avatar'
import type { MemberStat } from '@/lib/types'

interface MemberStatRowProps {
  stat: MemberStat
  isMe: boolean
}

export function MemberStatRow({ stat, isMe }: MemberStatRowProps) {
  const { profile, notes_received, completion_rate } = stat
  const pct = completion_rate

  return (
    <div className={[
      'flex items-center gap-[10px] px-[10px] py-2 rounded-lg border',
      isMe
        ? 'border-[#5DCAA5] bg-[#E1F5EE]'
        : 'border-border bg-background',
    ].join(' ')} style={{ borderWidth: '0.5px' }}>
      <Avatar name={profile.full_name} size={28} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[6px] mb-1">
          <span className={['text-[13px] text-foreground', isMe ? 'font-medium' : 'font-normal'].join(' ')}>
            {profile.full_name}
          </span>
          {isMe && (
            <span className="text-[10px] px-[6px] py-px rounded-[20px] bg-black/[.07] text-[#0F6E56] font-mono">
              you
            </span>
          )}
        </div>
        <div className={[
          'h-1 rounded-sm overflow-hidden',
          isMe ? 'bg-[rgba(29,158,117,0.2)]' : 'bg-muted',
        ].join(' ')}>
          <div style={{
            width:        `${pct}%`,
            height:       '100%',
            background:   isMe ? '#1D9E75' : '#378ADD',
            borderRadius: 2,
            transition:   'width .6s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-[13px] font-mono text-foreground">
          {notes_received} notes
        </div>
        <div className="text-[11px] text-muted-foreground font-mono">
          {pct}% done
        </div>
      </div>
    </div>
  )
}
