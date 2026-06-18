// src/components/board/NoteCard.tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { setNoteDone, setNotePriority, deleteNote, reportNote, toggleReaction, addEvidence, deleteEvidence } from '@/server/actions/notes'
import type { NoteSafe, NoteType, NoteEvidence } from '@/lib/types'
import { COMPETENCY_META } from '@/lib/growth/score'
import { cn } from '@/lib/utils'

// Explicit per-type chip (icon + label) so the note's intent reads at a glance,
// not just via background tint.
const TYPE_CHIP: Record<NoteType, { label: string; icon: string; bg: string; color: string }> = {
  strength: { label: 'Strength', icon: 'ti-star',         bg: '#CDEFE3', color: '#0F6E56' },
  growth:   { label: 'Growth',   icon: 'ti-target-arrow', bg: '#D5E8FB', color: '#185FA5' },
  general:  { label: 'General',  icon: 'ti-message-dots', bg: '#F6EDBE', color: '#7A5C00' },
}

// Tailwind arbitrary-value classes per note_type (bg + border)
const TYPE_BG_BORDER: Record<NoteType, string> = {
  general: 'bg-[#FFFDE7] border-[#E8CF3A]',
  strength: 'bg-[#E1F5EE] border-[#5DCAA5]',
  growth: 'bg-[#E6F1FB] border-[#85B7EB]',
}

// Text color per note_type
const TYPE_TEXT: Record<NoteType, string> = {
  general: 'text-[#3D2C00]',
  strength: 'text-[#04342C]',
  growth: 'text-[#042C53]',
}

interface NoteCardProps {
  note: NoteSafe
  currentUserId: string
  isDragging?: boolean
  /** Priority rank (1-based) — shown only in the Priorities lane. */
  rank?: number
  /** Optimistic priority toggle owned by BoardView (moves the note + persists). */
  onSetPriority?: (noteId: string, priority: boolean) => void
  /** True while BoardView is persisting this note's priority change. */
  saving?: boolean
  /** True when this card is rendered inside the Priorities lane. */
  inPriorityLane?: boolean
  /** Bumped by BoardView to trigger a "needs evidence" shake (e.g. a blocked drag-to-Done). */
  shakeSignal?: number
  /** Notifies BoardView when this note's evidence list changes (keeps the Done-gate in sync). */
  onEvidenceChange?: (noteId: string, evidence: NoteEvidence[]) => void
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Render evidence as plain text with clickable http(s) links interleaved.
// (split with a capturing group keeps the URLs as their own segments)
function renderEvidence(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline break-all"
        onClick={e => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function NoteCard({
  note, currentUserId, isDragging = false, rank, onSetPriority, saving = false,
  inPriorityLane = false, shakeSignal = 0, onEvidenceChange,
}: NoteCardProps) {
  const [showReport, setShowReport] = useState(false)
  const [reportText, setReportText] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [isPending, startTransition] = useTransition()

  // ── "Needs evidence" shake — visual alert when a Done attempt is blocked ──
  const [shake, setShake] = useState(false)
  function triggerNeedsEvidence() {
    setShowEvidence(true)               // reveal where to add proof
    setShake(false)                     // reset so the animation can replay
    requestAnimationFrame(() => requestAnimationFrame(() => setShake(true)))
  }
  // BoardView bumps shakeSignal when it blocks a drag-to-Done on this card.
  useEffect(() => {
    if (shakeSignal > 0) triggerNeedsEvidence()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeSignal])

  // ── Vote (+1) — optimistic local state from the 👍 reaction ──
  const thumbs = note.reactions?.find(r => r.emoji === '👍')
  const [voteCount, setVoteCount] = useState(thumbs?.count ?? 0)
  const [voted, setVoted] = useState(thumbs?.reacted_by_me ?? false)

  // ── Evidence — proof the recipient acted on the feedback ──
  const [evidence, setEvidence] = useState<NoteEvidence[]>(note.evidence ?? [])
  const [showEvidence, setShowEvidence] = useState(false)
  const [evidenceText, setEvidenceText] = useState('')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: note.id,
    // Only the recipient may drag — to reorder their own column or move
    // a note into / out of the Done zone. Everyone else's notes are locked.
    disabled: !note.can_mark_done,
  })

  const isLocked = note.done

  // Left accent in the note's primary competency colour, so a column is
  // scannable by competency at a glance. Muted/none on done notes.
  const primaryTag   = note.tags.find(t => COMPETENCY_META[t])
  const accentColor  = !isLocked && primaryTag ? COMPETENCY_META[primaryTag].color : undefined

  // KEEP dnd-kit transform/transition inline — cannot be expressed as static Tailwind
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.35 : 1,
    rotate: isDragging ? '1.5deg' : undefined,
    borderLeftColor: accentColor,
    borderLeftWidth: accentColor ? 3 : undefined,
  }

  function handleMarkDone() {
    // Evidence is required before a note can move to Done.
    if (evidence.length === 0) {
      triggerNeedsEvidence()
      return
    }
    startTransition(async () => {
      await setNoteDone(note.id, true)
    })
  }

  function handleUndone() {
    startTransition(async () => {
      await setNoteDone(note.id, false)
    })
  }

  function handleVote() {
    // optimistic toggle
    setVoted(v => !v)
    setVoteCount(c => (voted ? c - 1 : c + 1))
    startTransition(async () => {
      await toggleReaction(note.id, '👍')
    })
  }

  function handleTogglePriority() {
    // Prefer BoardView's optimistic handler (moves the note + shows a spinner).
    if (onSetPriority) {
      onSetPriority(note.id, !note.priority)
      return
    }
    startTransition(async () => {
      await setNotePriority(note.id, !note.priority)
    })
  }

  const dateLabel = formatNoteDate(note.created_at)

  function handleAddEvidence() {
    const text = evidenceText.trim()
    if (!text) return
    setEvidenceText('')
    startTransition(async () => {
      const row = await addEvidence(note.id, text)
      if (row) {
        setEvidence(prev => {
          const next = [...prev, row as NoteEvidence]
          onEvidenceChange?.(note.id, next)
          return next
        })
      }
    })
  }

  function handleDeleteEvidence(id: string) {
    setEvidence(prev => {
      const next = prev.filter(e => e.id !== id)
      onEvidenceChange?.(note.id, next)
      return next
    })
    startTransition(async () => {
      await deleteEvidence(id)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteNote(note.id)
    })
  }

  function handleReport() {
    if (!reportText.trim()) return
    startTransition(async () => {
      await reportNote(note.id, reportText.trim())
      setShowReport(false)
      setReportText('')
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onAnimationEnd={() => setShake(false)}
      className={cn(
        'relative rounded-[6px] border px-2.5 py-[9px] select-none',
        isLocked
          ? 'bg-muted border-border cursor-default'
          : cn(TYPE_BG_BORDER[note.note_type], 'cursor-grab'),
        shake && 'animate-shake ring-2 ring-[#C0392B]/60',
      )}
      {...attributes}
      {...listeners}
    >
      {/* Type chip — explicit intent at a glance */}
      {!isLocked && (
        <div className="mb-[5px]">
          <span
            className="inline-flex items-center gap-1 rounded-[5px] px-1.5 py-px text-[10px] font-medium"
            style={{ background: TYPE_CHIP[note.note_type].bg, color: TYPE_CHIP[note.note_type].color }}
          >
            <i className={cn('ti text-[10px]', TYPE_CHIP[note.note_type].icon)} aria-hidden="true" />
            {TYPE_CHIP[note.note_type].label}
          </span>
        </div>
      )}

      {/* Content */}
      <p className={cn(
        'text-xs leading-[1.5] m-0 break-words',
        note.tags.length > 0 ? 'mb-[6px]' : 'mb-0',
        isLocked
          ? 'text-muted-foreground/70 line-through'
          : TYPE_TEXT[note.note_type],
      )}>
        {note.content}
      </p>

      {/* Competency tags — coloured to match the Growth scorecard */}
      {note.tags.length > 0 && !isLocked && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {note.tags.map(tag => {
            const meta = COMPETENCY_META[tag]
            return (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-px rounded-[20px] font-medium"
                style={meta ? { background: `${meta.color}1A`, color: meta.color } : undefined}
              >
                {tag}
              </span>
            )
          })}
        </div>
      )}

      {/* Done badge */}
      {isLocked && (
        <div className="inline-flex items-center gap-[3px] text-xs px-1.5 py-px rounded-[3px] bg-[#E1F5EE] text-[#0F6E56] mb-[6px] font-mono">
          <i className="ti ti-check text-[9px]" aria-hidden="true" /> Done
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-[4px]">
        <span className={cn(
          'text-xs flex items-center gap-[4px] opacity-[.6] font-mono',
          isLocked ? 'text-muted-foreground/70' : TYPE_TEXT[note.note_type],
        )}>
          {typeof rank === 'number' && (
            <span className="font-medium not-italic">#{rank}</span>
          )}
          {dateLabel && <span className="opacity-70">{dateLabel}</span>}
        </span>

        {/* Actions */}
        <div
          className="flex items-center gap-[4px]"
          onPointerDown={e => e.stopPropagation()}
        >
          {/* +1 vote — any team member can upvote common feedback */}
          <button
            onClick={handleVote}
            disabled={isPending}
            aria-label={voted ? 'Remove your vote' : 'Give +1'}
            title={voted ? 'Remove your vote' : 'Agree (+1)'}
            className={cn(
              'flex items-center gap-[3px] text-sm px-1.5 py-px rounded-[20px] border font-mono transition-colors',
              voted
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-black/[.05] border-transparent text-muted-foreground hover:bg-black/[.1]',
            )}
          >
            <i className="ti ti-thumb-up text-[11px]" aria-hidden="true" />
            {voteCount > 0 ? <span className="text-xs">{voteCount}</span> : null}
          </button>

          {note.can_mark_done && !note.done && (
            <ActionBtn
              icon={saving ? 'ti-loader-2' : (note.priority ? 'ti-star-filled' : 'ti-star')}
              label={note.priority ? 'Remove from priorities' : 'Set as objective'}
              color="#B45309"
              onClick={handleTogglePriority}
              disabled={isPending || saving}
              spin={saving}
            />
          )}
          {note.can_mark_done && !note.done && !inPriorityLane && (
            <ActionBtn
              icon="ti-check"
              label="Mark done"
              color="#1D9E75"
              onClick={handleMarkDone}
              disabled={isPending}
            />
          )}
          {note.can_mark_done && note.done && (
            <ActionBtn
              icon="ti-arrow-back-up"
              label="Mark not done"
              color="#185FA5"
              onClick={handleUndone}
              disabled={isPending}
            />
          )}
          {/* Secondary actions in a labelled menu — clearer than a bare icon */}
          {(!note.is_mine || (note.is_mine && note.can_edit)) && (
            <div className="relative">
              <ActionBtn
                icon="ti-dots"
                label="More actions"
                color="#6b6b67"
                onClick={() => setShowMenu(v => !v)}
                disabled={isPending}
              />
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 min-w-[148px] rounded-lg border border-border bg-popover py-1 shadow-lg">
                    {!note.is_mine && (
                      <button
                        onClick={() => { setShowReport(true); setShowMenu(false) }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#854F0B] hover:bg-muted"
                      >
                        <i className="ti ti-flag text-[13px]" aria-hidden="true" />
                        Report note
                      </button>
                    )}
                    {note.is_mine && note.can_edit && (
                      <button
                        onClick={() => { setShowMenu(false); handleDelete() }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#993C1D] hover:bg-muted"
                      >
                        <i className="ti ti-trash text-[13px]" aria-hidden="true" />
                        Delete note
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Evidence — recipient documents how they acted on the feedback */}
      {(evidence.length > 0 || note.can_mark_done) && (
        <div
          className="mt-[6px] pt-[6px] border-t border-black/[.07]"
          onPointerDown={e => e.stopPropagation()}
        >
          <button
            onClick={() => setShowEvidence(v => !v)}
            className={cn(
              'flex items-center gap-[4px] text-xs font-mono opacity-70 hover:opacity-100',
              isLocked ? 'text-muted-foreground/70' : TYPE_TEXT[note.note_type],
            )}
          >
            <i className="ti ti-paperclip text-[11px]" aria-hidden="true" />
            Evidence{evidence.length > 0 ? ` (${evidence.length})` : ''}
            <i className={cn('ti text-[11px]', showEvidence ? 'ti-chevron-up' : 'ti-chevron-down')} aria-hidden="true" />
          </button>

          {showEvidence && (
            <div className="mt-[5px] flex flex-col gap-[4px]">
              {evidence.map(ev => (
                <div key={ev.id} className="flex items-start gap-[5px] bg-black/[.04] rounded-[4px] px-1.5 py-[4px]">
                  <i className="ti ti-circle-check text-[11px] text-[#0F6E56] mt-[1px] shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-[11px] text-foreground/80 break-words whitespace-pre-wrap">{renderEvidence(ev.content)}</span>
                  <span className="text-[9px] text-muted-foreground/70 font-mono shrink-0">{formatNoteDate(ev.created_at)}</span>
                  {note.can_mark_done && (
                    <button
                      onClick={() => handleDeleteEvidence(ev.id)}
                      aria-label="Delete evidence"
                      className="text-[#993C1D] opacity-50 hover:opacity-100 text-[11px] shrink-0"
                    >
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              {evidence.length === 0 && (
                <p className="text-sm text-muted-foreground m-0">
                  No proof yet — add evidence before you can mark this done.
                </p>
              )}
              {note.can_mark_done && (
                <div className="mt-[2px] flex flex-col gap-[4px]">
                  <textarea
                    value={evidenceText}
                    onChange={e => setEvidenceText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddEvidence()
                      }
                    }}
                    placeholder="Describe what you did and paste any links or proof…"
                    rows={2}
                    className="w-full text-[11px] px-[7px] py-1 border border-border rounded-[4px] bg-background text-foreground resize-none font-[inherit] leading-[1.5]"
                  />
                  <div className="flex items-center justify-between gap-[6px]">
                    <span className="min-w-0 truncate text-[9px] text-muted-foreground/70 font-mono whitespace-nowrap">
                      ⇧↵ new line
                    </span>
                    <button
                      onClick={handleAddEvidence}
                      disabled={!evidenceText.trim() || isPending}
                      className={cn(
                        'shrink-0 whitespace-nowrap text-[11px] px-2.5 py-[3px] rounded-[4px] bg-primary text-white',
                        (!evidenceText.trim() || isPending) && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      Add proof
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inline report form */}
      {showReport && (
        <div
          className="mt-[8px]"
          onPointerDown={e => e.stopPropagation()}
        >
          <textarea
            value={reportText}
            onChange={e => setReportText(e.target.value)}
            placeholder="Briefly describe the issue..."
            rows={2}
            className="w-full text-[11px] px-[7px] py-1 border border-border rounded-[4px] bg-background text-foreground resize-none font-[inherit]"
          />
          <div className="flex gap-[4px] mt-[4px]">
            <button
              onClick={() => setShowReport(false)}
              className="flex-1 text-sm py-[3px] border border-border rounded-[4px] bg-transparent cursor-pointer text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleReport}
              disabled={!reportText.trim() || isPending}
              className={cn(
                'flex-1 text-sm py-[3px] border-0 rounded-[4px] bg-[#854F0B] text-white',
                reportText.trim() ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50',
              )}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  icon, label, color, onClick, disabled, spin,
}: {
  icon: string; label: string; color: string; onClick: () => void; disabled?: boolean; spin?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'w-[20px] h-[20px] rounded-[4px] border-0 bg-transparent flex items-center justify-center text-xs p-0 transition-opacity duration-150',
        spin ? 'opacity-100 cursor-default' : disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer opacity-50',
      )}
      style={{ color }}
      onMouseEnter={e => { if (!disabled && !spin) e.currentTarget.style.opacity = '1' }}
      onMouseLeave={e => { if (!disabled && !spin) e.currentTarget.style.opacity = '.5' }}
    >
      <i className={cn('ti', icon, spin && 'animate-spin')} aria-hidden="true" />
    </button>
  )
}
