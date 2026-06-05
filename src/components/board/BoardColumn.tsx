// src/components/board/BoardColumn.tsx
'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { NoteCard }   from './NoteCard'
import { Avatar }     from '@/components/shared/Avatar'
import type { BoardColumn as BoardColumnType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BoardColumnProps {
  column:        BoardColumnType
  currentUserId: string
  onAddNote:     () => void
}

export function BoardColumn({ column, currentUserId, onAddNote }: BoardColumnProps) {
  const { member, notes, isMyColumn } = column
  const profile = member.profile

  const { setNodeRef, isOver } = useDroppable({ id: member.profile_id })

  const doneCount  = notes.filter(n => n.done).length
  const totalCount = notes.length

  return (
    <div
      className={cn(
        'w-[212px] shrink-0 rounded-[12px] flex flex-col',
        'transition-[border-color,background] duration-150',
        isOver && !isMyColumn
          ? 'border-[1.5px] border-primary bg-accent'
          : 'border border-border bg-background',
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          'px-3 pt-[10px] pb-[9px] border-b border-border flex items-center gap-[9px] rounded-t-[12px]',
          isMyColumn && 'bg-muted',
        )}
      >
        <Avatar name={profile.full_name} size={30} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[5px]">
            <h4 className="text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis m-0">
              {profile.full_name.split(' ')[0]}
            </h4>
            {isMyColumn && (
              <span className="text-[10px] px-[6px] py-[1px] rounded-[20px] bg-secondary text-muted-foreground/70 border border-border shrink-0">
                You
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground m-0">
            {totalCount === 0 ? 'No notes' : `${doneCount}/${totalCount} done`}
          </p>
        </div>
        {totalCount > 0 && (
          <div className="w-[26px] h-[26px] rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-medium text-muted-foreground shrink-0">
            {totalCount}
          </div>
        )}
      </div>

      {/* Notes area */}
      <div
        ref={setNodeRef}
        className="p-[8px] flex-1 flex flex-col gap-[6px] min-h-[120px]"
      >
        <SortableContext
          items={notes.map(n => n.id)}
          strategy={verticalListSortingStrategy}
        >
          {notes.length === 0 && !isMyColumn && (
            <div className="flex-1 flex flex-col items-center justify-center gap-[6px] opacity-40 px-[8px] py-[20px]">
              <i className="ti ti-note text-[22px] text-muted-foreground" aria-hidden="true" />
              <span className="text-[11px] text-muted-foreground text-center">
                No notes yet
              </span>
            </div>
          )}

          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              currentUserId={currentUserId}
            />
          ))}
        </SortableContext>

        {/* Add button or lock message */}
        {isMyColumn ? (
          <div className="flex flex-col items-center justify-center gap-[5px] px-[8px] py-[16px] opacity-40 mt-auto">
            <i className="ti ti-lock text-[18px] text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] text-muted-foreground text-center">
              Can&apos;t write on your own column
            </span>
          </div>
        ) : (
          <button
            onClick={onAddNote}
            className="flex items-center justify-center gap-[5px] p-[7px] border border-dashed border-border rounded-[6px] text-[12px] text-muted-foreground/70 bg-transparent cursor-pointer w-full transition-all duration-150 hover:border-primary hover:text-primary hover:bg-accent"
          >
            <i className="ti ti-plus text-[13px]" aria-hidden="true" />
            Add feedback
          </button>
        )}
      </div>
    </div>
  )
}
