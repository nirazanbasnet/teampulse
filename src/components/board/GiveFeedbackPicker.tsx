// ============================================================
// TeamPulse — Give-feedback picker
// src/components/board/GiveFeedbackPicker.tsx
//
// A searchable teammate picker that replaces hunting through a wall
// of columns. Type to filter, click a teammate to open the feedback
// composer for them. Scales to any team size.
// ============================================================

'use client'

import { useState } from 'react'
import { Avatar } from '@/components/shared/Avatar'
import type { BoardColumn } from '@/lib/types'

interface GiveFeedbackPickerProps {
  peers:  BoardColumn[]
  onPick: (recipientId: string, recipientName: string) => void
}

export function GiveFeedbackPicker({ peers, onPick }: GiveFeedbackPickerProps) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const filtered = query
    ? peers.filter(p =>
        p.member.profile.full_name.toLowerCase().includes(query) ||
        (p.member.profile.email ?? '').toLowerCase().includes(query),
      )
    : peers

  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <i className="ti ti-message-plus text-[16px] text-primary" aria-hidden="true" />
          <h3 className="m-0 text-[13px] font-medium">Give feedback</h3>
          <span className="text-[11px] text-muted-foreground">· pick a teammate</span>
        </div>
        <div className="relative sm:w-[240px]">
          <i className="ti ti-search pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground" aria-hidden="true" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search teammate…"
            aria-label="Search teammate"
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-[13px] text-foreground"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-3 text-center text-[12px] text-muted-foreground">
          No teammates match &ldquo;{q}&rdquo;.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filtered.map(p => {
            const prof = p.member.profile
            return (
              <button
                key={p.member.profile_id}
                onClick={() => onPick(p.member.profile_id, prof.full_name)}
                title={`Give feedback to ${prof.full_name}`}
                className="group flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3 transition-colors hover:border-primary hover:bg-accent"
              >
                <Avatar name={prof.full_name} size={26} src={prof.avatar_url} email={prof.email} />
                <span className="text-[12.5px] text-foreground">{prof.full_name.split(' ')[0]}</span>
                <i className="ti ti-plus text-[13px] text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
