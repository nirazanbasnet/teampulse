// ============================================================
// TeamPulse — Add Note Modal
// src/components/board/AddNoteModal.tsx
// ============================================================

'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createNote } from '@/server/actions/notes'
import type { NoteTag, NoteType, NoteSafe } from '@/lib/types'
import { cn } from '@/lib/utils'

const NOTE_TYPES: { key: NoteType; label: string; desc: string }[] = [
  { key: 'general',  label: 'General',  desc: 'Any observation' },
  { key: 'strength', label: 'Strength', desc: 'Keep doing this'  },
  { key: 'growth',   label: 'Growth',   desc: 'Improve here'     },
]

const ALL_TAGS: NoteTag[] = [
  'Communication', 'Technical', 'Collaboration', 'Leadership', 'Delivery',
]

const CHAR_LIMIT = 400

interface AddNoteModalProps {
  teamId:        string
  cycleId?:      string
  recipientId:   string
  recipientName: string
  onClose:       () => void
  onSuccess:     (note: NoteSafe) => void
}

export function AddNoteModal({
  teamId,
  cycleId,
  recipientId,
  recipientName,
  onClose,
  onSuccess,
}: AddNoteModalProps) {
  const [noteType, setNoteType]   = useState<NoteType>('general')
  const [tags, setTags]           = useState<NoteTag[]>([])
  const [content, setContent]     = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function toggleTag(tag: NoteTag) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function handleSubmit() {
    if (content.trim().length < 10) {
      setError('Please write at least 10 characters.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        await createNote({
          team_id:      teamId,
          cycle_id:     cycleId,
          recipient_id: recipientId,
          note_type:    noteType,
          content:      content.trim(),
          tags,
        })

        // Build optimistic note for immediate UI update
        const optimisticNote: NoteSafe = {
          id:            crypto.randomUUID(),
          team_id:       teamId,
          cycle_id:      cycleId ?? null,
          recipient_id:  recipientId,
          note_type:     noteType,
          content:       content.trim(),
          tags,
          position:      999,
          done:          false,
          done_at:       null,
          priority:      false,
          created_at:    new Date().toISOString(),
          updated_at:    new Date().toISOString(),
          is_mine:       true,
          can_mark_done: false,
          can_edit:      true,
          reactions:     [],
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
  const canSubmit = content.trim().length >= 10 && !isPending

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-background border border-border rounded-[12px] p-6 w-full max-w-[420px]"
        role="dialog"
        aria-modal="true"
        aria-label={`Add anonymous feedback for ${recipientName}`}
      >
        <div className="flex items-center gap-[10px] mb-[18px]">
          <div className="flex-1">
            <h2 className="text-[15px] font-medium m-0">
              Feedback for {recipientName}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Posted anonymously — your name is never shown
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-transparent border-none cursor-pointer p-1 text-muted-foreground"
          >
            ✕
          </button>
        </div>

        {/* Note type selector */}
        <div className="mb-[14px]">
          <p className="text-[12px] text-muted-foreground mb-[6px]">
            Note type
          </p>
          <div className="flex gap-[6px]">
            {NOTE_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setNoteType(t.key)}
                aria-pressed={noteType === t.key}
                className={cn(
                  'flex-1 py-[7px] px-1 rounded-lg text-[12px] text-center cursor-pointer',
                  noteType === t.key
                    ? cn(
                        'border-2 border-current font-medium',
                        t.key === 'general'  && 'bg-[#FFFDE7] text-[#3D2C00]',
                        t.key === 'strength' && 'bg-[#E1F5EE] text-[#04342C]',
                        t.key === 'growth'   && 'bg-[#E6F1FB] text-[#042C53]',
                      )
                    : 'border border-border bg-transparent text-muted-foreground font-normal',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tag selector */}
        <div className="mb-[14px]">
          <p className="text-[12px] text-muted-foreground mb-[6px]">
            Categories (optional)
          </p>
          <div className="flex flex-wrap gap-[5px]">
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                aria-pressed={tags.includes(tag)}
                className={cn(
                  'py-[3px] px-[10px] rounded-[20px] border border-border text-[12px] cursor-pointer transition-all duration-150',
                  tags.includes(tag)
                    ? 'bg-foreground text-background'
                    : 'bg-transparent text-muted-foreground',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Content textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your feedback... (Cmd+Enter to submit)"
          maxLength={CHAR_LIMIT}
          rows={4}
          className="w-full resize-y text-[13px] py-[10px] px-3 border border-border rounded-lg bg-muted text-foreground font-[inherit] leading-[1.5]"
        />

        <div className="flex justify-between items-center mt-[6px] mb-[14px]">
          <span
            className={cn(
              'text-[11px] font-mono',
              remaining < 50 ? 'text-[#993C1D]' : 'text-muted-foreground',
            )}
          >
            {remaining} chars remaining
          </span>
          {error && (
            <span className="text-[11px] text-[#993C1D]">{error}</span>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="py-2 px-4 border border-border rounded-lg bg-transparent cursor-pointer text-[13px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'py-2 px-4 border-none rounded-lg text-[13px] font-medium transition-opacity duration-150',
              canSubmit
                ? 'bg-primary text-white cursor-pointer'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {isPending ? 'Posting...' : 'Post anonymously'}
          </button>
        </div>
      </div>
    </div>
  )
}
