// ============================================================
// TeamPulse — Add Note Modal (guided feedback composer)
// src/components/board/AddNoteModal.tsx
//
// Competency-first flow: intent → area → specific feedback. Picking
// an area is required for strength/growth notes so the feedback
// actually lands on the recipient's Growth scorecard.
// ============================================================

'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createNote } from '@/server/actions/notes'
import { COMPETENCY_META } from '@/lib/growth/score'
import type { NoteTag, NoteType, NoteSafe } from '@/lib/types'
import { cn } from '@/lib/utils'

const NOTE_TYPES: { key: NoteType; label: string; desc: string; icon: string }[] = [
  { key: 'strength', label: 'Strength', desc: 'Keep doing this', icon: 'ti-star' },
  { key: 'growth',   label: 'Growth',   desc: 'Improve here',    icon: 'ti-target-arrow' },
  { key: 'general',  label: 'General',  desc: 'An observation',  icon: 'ti-message-dots' },
]

const TYPE_ON: Record<NoteType, string> = {
  strength: 'bg-[#E1F5EE] text-[#04342C] border-[#5DCAA5]',
  growth:   'bg-[#E6F1FB] text-[#042C53] border-[#85B7EB]',
  general:  'bg-[#FFFDE7] text-[#3D2C00] border-[#E8CF3A]',
}

const ALL_TAGS: NoteTag[] = ['Communication', 'Technical', 'Collaboration', 'Leadership', 'Delivery']

const PLACEHOLDER: Record<NoteType, string> = {
  strength: 'What did they do well — and what impact did it have?',
  growth:   'What could be better, and why? Be specific and kind.',
  general:  'Share an observation…',
}

const CHAR_LIMIT = 400

interface AddNoteModalProps {
  teamId: string
  cycleId?: string
  recipientId: string
  recipientName: string
  onClose: () => void
  onSuccess: (note: NoteSafe) => void
}

export function AddNoteModal({
  teamId, cycleId, recipientId, recipientName, onClose, onSuccess,
}: AddNoteModalProps) {
  const [noteType, setNoteType] = useState<NoteType>('strength')
  const [tags, setTags] = useState<NoteTag[]>([])
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  function toggleTag(tag: NoteTag) {
    setError(null)
    setTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]))
  }

  const needsArea = noteType !== 'general' && tags.length === 0

  function handleSubmit() {
    if (content.trim().length < 10) {
      setError('Please write at least 10 characters.')
      return
    }
    if (needsArea) {
      setError('Pick at least one area — it’s what lands this on their scorecard.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const result = await createNote({
          team_id: teamId,
          cycle_id: cycleId,
          recipient_id: recipientId,
          note_type: noteType,
          content: content.trim(),
          tags,
        })

        // Expected, user-facing rejection (e.g. AI moderation block).
        // Returned as a value so the message survives the server→client
        // boundary even in production, where Next.js redacts thrown errors.
        if (!result.success) {
          setError(result.error)
          return
        }

        const optimisticNote: NoteSafe = {
          id: crypto.randomUUID(),
          team_id: teamId,
          cycle_id: cycleId ?? null,
          recipient_id: recipientId,
          note_type: noteType,
          content: content.trim(),
          tags,
          position: 999,
          done: false,
          done_at: null,
          priority: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_mine: true,
          can_mark_done: false,
          can_edit: true,
          reactions: [],
        }
        onSuccess(optimisticNote)
      } catch (err: any) {
        setError(err.message ?? 'Failed to post note. Please try again.')
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  const remaining = CHAR_LIMIT - content.length
  const canSubmit = content.trim().length >= 10 && !needsArea && !isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-[440px] rounded-[14px] border border-border bg-background p-6"
        role="dialog"
        aria-modal="true"
        aria-label={`Add anonymous feedback for ${recipientName}`}
      >
        <div className="mb-5 flex items-start gap-2.5">
          <div className="flex-1">
            <h2 className="m-0 text-[15px] font-medium">Feedback for {recipientName}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <i className="ti ti-lock text-[12px]" aria-hidden="true" />
              Anonymous — your name is never shown
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer border-none bg-transparent p-1 text-muted-foreground">✕</button>
        </div>

        {/* Step 1 — intent */}
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">1 · Type</p>
        <div className="mb-4 grid grid-cols-3 gap-1.5">
          {NOTE_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => { setNoteType(t.key); setError(null) }}
              aria-pressed={noteType === t.key}
              className={cn(
                'flex flex-col items-center gap-1 rounded-[10px] border px-1 py-2.5 text-center transition-all',
                noteType === t.key ? cn('border-2 font-medium', TYPE_ON[t.key]) : 'border-border bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <i className={cn('ti text-[16px]', t.icon)} aria-hidden="true" />
              <span className="text-[12px]">{t.label}</span>
              <span className="text-[10px] opacity-70">{t.desc}</span>
            </button>
          ))}
        </div>

        {/* Step 2 — competency */}
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          2 · Area
          {noteType === 'general'
            ? <span className="font-normal normal-case tracking-normal text-muted-foreground/70">optional</span>
            : <span className="font-normal normal-case tracking-normal text-[#A32D2D]">required</span>}
        </p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {ALL_TAGS.map(tag => {
            const meta = COMPETENCY_META[tag]
            const on = tags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                aria-pressed={on}
                className="rounded-[20px] border px-2.5 py-1 text-xs transition-all"
                style={on
                  ? { background: meta.color, color: '#fff', borderColor: meta.color }
                  : { background: `${meta.color}12`, color: meta.color, borderColor: `${meta.color}38` }}
              >
                {tag}
              </button>
            )
          })}
        </div>

        {/* Step 3 — the feedback */}
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">3 · What happened</p>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => { setContent(e.target.value); if (error) setError(null) }}
          placeholder={PLACEHOLDER[noteType]}
          maxLength={CHAR_LIMIT}
          rows={4}
          className="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2.5 text-[13px] font-[inherit] leading-[1.5] text-foreground"
        />
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <i className="ti ti-bulb mt-px text-[12px]" aria-hidden="true" />
          Name the behaviour + its impact — e.g. “Led the ALATA migration and cut deploy time 40%.”
        </p>

        <div className="mt-3 mb-4 flex items-center justify-between">
          <span className={cn('font-mono text-[11px]', remaining < 50 ? 'text-[#993C1D]' : 'text-muted-foreground')}>
            {remaining} left
          </span>
          {error && <span className="rounded bg-[#FAECE7] px-2 py-1 text-[11px] text-[#993C1D]">{error}</span>}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="cursor-pointer rounded-lg border border-border bg-transparent px-4 py-2 text-[13px]">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'rounded-lg border-none px-4 py-2 text-[13px] font-medium transition-opacity',
              canSubmit ? 'cursor-pointer bg-primary text-white' : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            {isPending ? 'Posting…' : 'Post anonymously'}
          </button>
        </div>
      </div>
    </div>
  )
}
