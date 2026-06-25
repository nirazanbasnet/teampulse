// src/components/board/PeerRoster.tsx
'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { PeerCard } from './PeerCard'
import { PeerDrawer } from './PeerDrawer'
import { COMPETENCIES, COMPETENCY_META } from '@/lib/growth/score'
import type { BoardColumn } from '@/lib/types'

// The team-feedback surface, overview-first: a calm, responsive grid of
// teammate summary cards (give + browse in one place), with a focus
// drawer for the selected person. Replaces the old wall of per-member
// columns so the board stays scannable however much feedback piles up.

interface PeerRosterProps {
  peers:         BoardColumn[]
  currentUserId: string
  onAddNote:     (recipientId: string, recipientName: string) => void
  onNoteDelete:  (noteId: string) => void
  /** Extra control rendered in the header (e.g. the Roster/Kanban toggle). */
  toolbar?:      ReactNode
}

export function PeerRoster({ peers, currentUserId, onAddNote, onNoteDelete, toolbar }: PeerRosterProps) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showLegend, setShowLegend] = useState(false)

  const q = search.trim().toLowerCase()
  const visible = useMemo(
    () => (q ? peers.filter(p => p.member.profile.full_name?.toLowerCase().includes(q)) : peers),
    [peers, q],
  )
  const selected = peers.find(p => p.member.profile_id === selectedId) ?? null

  return (
    <div className="mt-4">
      {/* Section header + search */}
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <i className="ti ti-users text-[15px] text-foreground/70" aria-hidden="true" />
        <h3 className="m-0 text-[13px] font-medium">Team feedback</h3>
        <span className="text-[11px] text-muted-foreground">· pick a teammate to give or read feedback</span>

        {/* Legend — explains every signal on a teammate card */}
        <div className="relative">
          <button
            onClick={() => setShowLegend(v => !v)}
            aria-label="What the card signals mean"
            title="What the card signals mean"
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-muted hover:text-foreground"
          >
            <i className="ti ti-help-circle text-[15px]" aria-hidden="true" />
          </button>
          {showLegend && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLegend(false)} />
              <div className="absolute left-0 top-full z-50 mt-1.5 w-[300px] rounded-xl border border-border bg-popover p-3.5 text-[12px] shadow-lg">
                <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Reading a teammate card</p>
                <ul className="flex flex-col gap-2.5 leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 flex shrink-0 gap-1">
                      {COMPETENCIES.map(k => (
                        <span key={k} className="h-2 w-2 rounded-full" style={{ background: COMPETENCY_META[k].color }} />
                      ))}
                    </span>
                    <span><span className="font-medium text-foreground">Competency coverage</span> — which of the 5 growth areas (Technical, Communication, Collaboration, Leadership, Delivery) their feedback touches. Faint = none yet.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-[13px]">
                      <i className="ti ti-star text-[#0F6E56]" aria-hidden="true" />
                      <i className="ti ti-target-arrow text-[#854F0B]" aria-hidden="true" />
                      <i className="ti ti-message-dots text-[#6b6b67]" aria-hidden="true" />
                    </span>
                    <span><span className="font-medium text-foreground">Strength · Growth · General</span> — note counts by type.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-px shrink-0 font-mono text-[10px] text-foreground">x/y</span>
                    <span><span className="font-medium text-foreground">Actioned</span> — notes they&apos;ve marked done.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <i className="ti ti-pointer mt-0.5 shrink-0 text-[13px]" aria-hidden="true" />
                    <span>Click a card to read all their feedback or add your own.</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <i className="ti ti-search pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground" aria-hidden="true" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search teammate…"
              className="h-8 w-[200px] rounded-lg border border-border bg-background pl-8 pr-2.5 text-[12px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          {toolbar}
        </div>
      </div>

      {/* Roster grid */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(col => (
            <PeerCard
              key={col.member.profile_id}
              column={col}
              onOpen={() => setSelectedId(col.member.profile_id)}
              onAdd={() => onAddNote(col.member.profile_id, col.member.profile.full_name)}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-[14px] border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
          No teammate matches “{search}”.
        </p>
      )}

      {/* Focus drawer */}
      {selected && (
        <PeerDrawer
          column={selected}
          currentUserId={currentUserId}
          onClose={() => setSelectedId(null)}
          onAdd={() => onAddNote(selected.member.profile_id, selected.member.profile.full_name)}
          onNoteDelete={onNoteDelete}
        />
      )}
    </div>
  )
}
