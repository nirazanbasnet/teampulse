// src/components/board/PeerCard.tsx
'use client'

import { Avatar } from '@/components/shared/Avatar'
import { COMPETENCIES, COMPETENCY_META } from '@/lib/growth/score'
import type { BoardColumn, NoteType } from '@/lib/types'
import { cn } from '@/lib/utils'

// A teammate's feedback at a glance — the overview half of the
// overview-first board. The growth signal (which competencies their
// feedback touches + how much is actioned) is the hero, so a crowded
// team reads as a calm, scannable grid instead of a wall of cards.

const TYPE_META: Record<NoteType, { icon: string; color: string; label: string; hint: string }> = {
  strength: { icon: 'ti-star',         color: '#0F6E56', label: 'strength', hint: 'what they do well' },
  growth:   { icon: 'ti-target-arrow', color: '#854F0B', label: 'growth',   hint: 'areas to improve' },
  general:  { icon: 'ti-message-dots',  color: '#6b6b67', label: 'general',  hint: 'observations' },
}

interface PeerCardProps {
  column:  BoardColumn
  onOpen:  () => void
  onAdd:   () => void
}

export function PeerCard({ column, onOpen, onAdd }: PeerCardProps) {
  const { member, notes } = column
  const profile = member.profile

  const total = notes.length
  const done  = notes.filter(n => n.done).length
  const counts: Record<NoteType, number> = {
    strength: notes.filter(n => n.note_type === 'strength').length,
    growth:   notes.filter(n => n.note_type === 'growth').length,
    general:  notes.filter(n => n.note_type === 'general').length,
  }
  const covered = new Set(notes.flatMap(n => n.tags))
  const coveredCount = COMPETENCIES.filter(k => covered.has(k)).length
  const latest = total > 0
    ? [...notes].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]
    : null
  const isLead = (member as any).role === 'lead'

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      aria-label={`View feedback for ${profile.full_name}`}
      className="group flex cursor-pointer flex-col gap-2.5 rounded-[14px] border border-border bg-card p-3.5 text-left transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Avatar name={profile.full_name} size={34} src={(profile as any).avatar_url} email={profile.email} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium capitalize">{profile.full_name}</span>
            {isLead && (
              <span className="shrink-0 rounded-[20px] border border-[#F5E0B8] bg-[#FAEEDA] px-1.5 py-px text-[9px] text-[#854F0B]">Lead</span>
            )}
          </div>
          <span
            className="font-mono text-[11px] text-muted-foreground"
            title={total === 0 ? 'No feedback received yet' : `${done} of ${total} notes marked done (actioned)`}
          >
            {total === 0 ? 'No feedback yet' : `${done}/${total} actioned`}
          </span>
        </div>
        <i className="ti ti-chevron-right text-[15px] text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" aria-hidden="true" title="Open full feedback" />
      </div>

      {/* Competency coverage — the growth signal, on the same axes as the scorecard */}
      <div
        className="flex items-center gap-1.5"
        title="Competency coverage — which of the 5 growth areas this person's feedback touches"
      >
        {COMPETENCIES.map(key => {
          const meta = COMPETENCY_META[key]
          const n = notes.filter(x => x.tags.includes(key)).length
          const on = n > 0
          return (
            <span
              key={key}
              title={`${meta.label}: ${on ? `${n} note${n === 1 ? '' : 's'}` : 'no feedback yet'}`}
              className={cn('h-2 w-2 rounded-full transition-opacity', !on && 'opacity-15')}
              style={{ background: meta.color }}
            />
          )
        })}
        <span className="ml-1 font-mono text-[10px] text-muted-foreground/70" title={`${coveredCount} of 5 growth areas covered`}>
          {coveredCount}/5
        </span>
      </div>

      {/* Type counts */}
      {total > 0 && (
        <div className="flex items-center gap-3 font-mono text-[11px]">
          {(Object.keys(counts) as NoteType[]).map(t =>
            counts[t] > 0 ? (
              <span
                key={t}
                className="flex items-center gap-1"
                style={{ color: TYPE_META[t].color }}
                title={`${counts[t]} ${TYPE_META[t].label} note${counts[t] === 1 ? '' : 's'} — ${TYPE_META[t].hint}`}
              >
                <i className={cn('ti text-[12px]', TYPE_META[t].icon)} aria-hidden="true" />
                {counts[t]}
              </span>
            ) : null,
          )}
        </div>
      )}

      {/* Latest note preview */}
      {latest ? (
        <p className="line-clamp-2 text-[12px] leading-snug text-foreground/75">{latest.content}</p>
      ) : (
        <p className="text-[12px] italic leading-snug text-muted-foreground/60">Be the first to leave feedback.</p>
      )}

      {/* Add feedback — the give half, in context */}
      <div className="mt-auto pt-0.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-primary"
        >
          <i className="ti ti-plus text-[13px]" aria-hidden="true" />
          Add feedback
        </button>
      </div>
    </div>
  )
}
