// src/components/board/PeerDrawer.tsx
'use client'

import { useEffect, useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { NoteCard } from './NoteCard'
import { Avatar } from '@/components/shared/Avatar'
import { COMPETENCIES, COMPETENCY_META } from '@/lib/growth/score'
import type { BoardColumn, NoteTag, NoteType } from '@/lib/types'
import { cn } from '@/lib/utils'

// The detail half of the overview-first board: a focused panel for ONE
// teammate's feedback, filterable by type + competency, with the give-
// feedback CTA in reach. Renders inside the board's DndContext so the
// reused NoteCards keep their (disabled) sortable wiring.

const TYPE_TABS: { key: NoteType | 'all'; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'strength', label: 'Strengths' },
  { key: 'growth',   label: 'Growth' },
  { key: 'general',  label: 'General' },
]

interface PeerDrawerProps {
  column:        BoardColumn
  currentUserId: string
  onClose:       () => void
  onAdd:         () => void
  onNoteDelete:  (noteId: string) => void
}

export function PeerDrawer({ column, currentUserId, onClose, onAdd, onNoteDelete }: PeerDrawerProps) {
  const { member, notes } = column
  const profile = member.profile

  const [show, setShow] = useState(false)
  const [type, setType] = useState<NoteType | 'all'>('all')
  const [comps, setComps] = useState<Set<NoteTag>>(new Set())

  // Enter animation + scroll lock; handleClose drives the exit animation.
  useEffect(() => {
    setShow(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    setShow(false)
    setTimeout(onClose, 200)
  }

  function toggleComp(c: NoteTag) {
    setComps(prev => {
      const next = new Set(prev)
      next.has(c) ? next.delete(c) : next.add(c)
      return next
    })
  }

  const total = notes.length
  const done  = notes.filter(n => n.done).length

  const filtered = notes
    .filter(n => (type === 'all' || n.note_type === type))
    .filter(n => (comps.size === 0 || n.tags.some(t => comps.has(t))))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  const isLead = (member as any).role === 'lead'

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <div
        className={cn('absolute inset-0 bg-black/40 transition-opacity duration-200', show ? 'opacity-100' : 'opacity-0')}
        onClick={handleClose}
      />

      <div
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-background shadow-xl transition-transform duration-200',
          show ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Avatar name={profile.full_name} size={36} src={(profile as any).avatar_url} email={profile.email} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-[15px] font-medium capitalize">{profile.full_name}</h2>
              {isLead && (
                <span className="shrink-0 rounded-[20px] border border-[#F5E0B8] bg-[#FAEEDA] px-1.5 py-px text-[9px] text-[#854F0B]">Lead</span>
              )}
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {total === 0 ? 'No feedback yet' : `${total} note${total === 1 ? '' : 's'} · ${done} actioned`}
            </p>
          </div>
          <button onClick={handleClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
            <i className="ti ti-x text-[16px]" aria-hidden="true" />
          </button>
        </div>

        {/* Give feedback CTA */}
        <div className="border-b border-border px-4 py-2.5">
          <button
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[13px] font-medium text-white hover:opacity-90"
          >
            <i className="ti ti-plus text-[14px]" aria-hidden="true" />
            Add feedback for {profile.full_name.split(' ')[0]}
          </button>
        </div>

        {/* Filters */}
        {total > 0 && (
          <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
              {TYPE_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  aria-pressed={type === t.key}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                    type === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMPETENCIES.map(key => {
                const meta = COMPETENCY_META[key]
                const on = comps.has(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleComp(key)}
                    aria-pressed={on}
                    className="rounded-[20px] border px-2 py-0.5 text-[11px] transition-all"
                    style={on
                      ? { background: meta.color, color: '#fff', borderColor: meta.color }
                      : { background: `${meta.color}12`, color: meta.color, borderColor: `${meta.color}30` }}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Feedback list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {total === 0 ? (
            <Empty icon="ti-note" text="No feedback yet — be the first to leave some." />
          ) : filtered.length === 0 ? (
            <Empty icon="ti-filter" text="No feedback matches these filters." />
          ) : (
            <SortableContext items={filtered.map(n => n.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {filtered.map(note => (
                  <NoteCard key={note.id} note={note} currentUserId={currentUserId} onDelete={onNoteDelete} />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  )
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <i className={cn('ti text-[26px] text-muted-foreground/40', icon)} aria-hidden="true" />
      <p className="max-w-[220px] text-[12px] text-muted-foreground">{text}</p>
    </div>
  )
}
