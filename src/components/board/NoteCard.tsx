// src/components/board/NoteCard.tsx
'use client'

import { useState, useTransition } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS }         from '@dnd-kit/utilities'
import { markNoteDone, deleteNote, reportNote } from '@/server/actions/notes'
import type { NoteSafe, NoteType } from '@/lib/types'
import { cn } from '@/lib/utils'

const TYPE_STYLES: Record<NoteType, { bg: string; border: string; color: string; label: string }> = {
  general:  { bg: '#FFFDE7', border: '#E8CF3A', color: '#3D2C00', label: 'General'  },
  strength: { bg: '#E1F5EE', border: '#5DCAA5', color: '#04342C', label: 'Strength' },
  growth:   { bg: '#E6F1FB', border: '#85B7EB', color: '#042C53', label: 'Growth'   },
}

// Tailwind arbitrary-value classes per note_type (bg + border)
const TYPE_BG_BORDER: Record<NoteType, string> = {
  general:  'bg-[#FFFDE7] border-[#E8CF3A]',
  strength: 'bg-[#E1F5EE] border-[#5DCAA5]',
  growth:   'bg-[#E6F1FB] border-[#85B7EB]',
}

// Text color per note_type
const TYPE_TEXT: Record<NoteType, string> = {
  general:  'text-[#3D2C00]',
  strength: 'text-[#04342C]',
  growth:   'text-[#042C53]',
}

interface NoteCardProps {
  note:          NoteSafe
  currentUserId: string
  isDragging?:   boolean
}

export function NoteCard({ note, currentUserId, isDragging = false }: NoteCardProps) {
  const [showReport,  setShowReport]  = useState(false)
  const [reportText,  setReportText]  = useState('')
  const [isPending, startTransition]  = useTransition()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id:       note.id,
    disabled: note.done || (!note.is_mine && !note.can_mark_done),
  })

  // KEEP dnd-kit transform/transition inline — cannot be expressed as static Tailwind
  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isSortableDragging ? 0.35 : 1,
    rotate:     isDragging ? '1.5deg' : undefined,
  }

  const typeStyle = TYPE_STYLES[note.note_type]
  const isLocked  = note.done

  function handleMarkDone() {
    startTransition(async () => {
      await markNoteDone(note.id)
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
      className={cn(
        'relative rounded-[6px] border px-[10px] py-[9px] select-none',
        isLocked
          ? 'bg-muted border-border cursor-default'
          : cn(TYPE_BG_BORDER[note.note_type], 'cursor-grab'),
      )}
      {...attributes}
      {...listeners}
    >
      {/* Type indicator dot */}
      {!isLocked && (
        <div
          className="absolute top-2 right-2 w-[6px] h-[6px] rounded-full opacity-70"
          style={{ background: typeStyle.border }}
        />
      )}

      {/* Content */}
      <p className={cn(
        'text-[12px] leading-[1.5] m-0 pr-[10px] break-words',
        note.tags.length > 0 ? 'mb-[6px]' : 'mb-0',
        isLocked
          ? 'text-muted-foreground/70 line-through'
          : TYPE_TEXT[note.note_type],
      )}>
        {note.content}
      </p>

      {/* Tags */}
      {note.tags.length > 0 && !isLocked && (
        <div className="flex flex-wrap gap-[3px] mb-[6px]">
          {note.tags.map(tag => (
            <span
              key={tag}
              className={cn(
                'text-[10px] px-[6px] py-[1px] rounded-[20px] bg-black/[.07] font-mono',
                TYPE_TEXT[note.note_type],
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Done badge */}
      {isLocked && (
        <div className="inline-flex items-center gap-[3px] text-[10px] px-[6px] py-[1px] rounded-[3px] bg-[#E1F5EE] text-[#0F6E56] mb-[6px] font-mono">
          <i className="ti ti-check text-[9px]" aria-hidden="true" /> Done
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-[4px]">
        <span className={cn(
          'text-[10px] flex items-center gap-[3px] opacity-[.55] font-mono',
          isLocked ? 'text-muted-foreground/70' : TYPE_TEXT[note.note_type],
        )}>
          <i className="ti ti-eye-off text-[10px]" aria-hidden="true" />
          anon
        </span>

        {/* Actions */}
        <div
          className="flex gap-[2px]"
          onPointerDown={e => e.stopPropagation()}
        >
          {note.can_mark_done && !note.done && (
            <ActionBtn
              icon="ti-check"
              label="Mark done"
              color="#1D9E75"
              onClick={handleMarkDone}
              disabled={isPending}
            />
          )}
          {note.is_mine && note.can_edit && (
            <ActionBtn
              icon="ti-trash"
              label="Delete note"
              color="#993C1D"
              onClick={handleDelete}
              disabled={isPending}
            />
          )}
          {!note.is_mine && (
            <ActionBtn
              icon="ti-flag"
              label="Report note"
              color="#854F0B"
              onClick={() => setShowReport(v => !v)}
              disabled={isPending}
            />
          )}
        </div>
      </div>

      {/* Reactions */}
      {note.reactions && note.reactions.length > 0 && (
        <div
          className="flex gap-[4px] mt-[5px] flex-wrap"
          onPointerDown={e => e.stopPropagation()}
        >
          {note.reactions.map(r => (
            <span
              key={r.emoji}
              className={cn(
                'text-[11px] px-[6px] py-[1px] rounded-[20px] cursor-pointer',
                r.reacted_by_me
                  ? 'bg-black/[.12] border border-[rgba(0,0,0,.2)]'
                  : 'bg-black/[.05] border border-transparent',
              )}
            >
              {r.emoji} {r.count}
            </span>
          ))}
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
            className="w-full text-[11px] px-[7px] py-[5px] border border-border rounded-[4px] bg-background text-foreground resize-none font-[inherit]"
          />
          <div className="flex gap-[4px] mt-[4px]">
            <button
              onClick={() => setShowReport(false)}
              className="flex-1 text-[10px] py-[3px] border border-border rounded-[4px] bg-transparent cursor-pointer text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleReport}
              disabled={!reportText.trim() || isPending}
              className={cn(
                'flex-1 text-[10px] py-[3px] border-0 rounded-[4px] bg-[#854F0B] text-white',
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
  icon, label, color, onClick, disabled,
}: {
  icon: string; label: string; color: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'w-[20px] h-[20px] rounded-[4px] border-0 bg-transparent flex items-center justify-center text-[12px] p-0 transition-opacity duration-[150ms]',
        disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer opacity-50',
      )}
      style={{ color }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '1' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '.5' }}
    >
      <i className={`ti ${icon}`} aria-hidden="true" />
    </button>
  )
}
