// ============================================================
// TeamPulse — BoardView (Client Component)
// src/components/board/BoardView.tsx
//
// Renders the kanban board with dnd-kit drag-and-drop.
// Subscribes to Supabase Realtime for live updates.
// Handles optimistic UI for note creation and reordering.
// ============================================================

'use client'

import { useState, useCallback, useTransition } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import { BoardColumn }      from './BoardColumn'
import { NoteCard }         from './NoteCard'
import { AddNoteModal }     from './AddNoteModal'
import { MetricsBar }       from './MetricsBar'
import { useBoardRealtime } from '@/lib/hooks/use-board-realtime'
import { reorderNotes, moveNote } from '@/server/actions/notes'

import type { BoardState, NoteSafe, Profile } from '@/lib/types'

interface BoardViewProps {
  boardState:    BoardState
  currentUserId: string
}

export function BoardView({ boardState, currentUserId }: BoardViewProps) {
  const [columns, setColumns] = useState(boardState.columns)
  const [activeNote, setActiveNote]   = useState<NoteSafe | null>(null)
  const [addModalFor, setAddModalFor] = useState<{ recipientId: string; recipientName: string } | null>(null)
  const [, startTransition] = useTransition()

  // ── Realtime subscription ─────────────────────────────────

  const handleNoteChange = useCallback(
    (event: 'INSERT' | 'UPDATE' | 'DELETE', note: Partial<NoteSafe> & { id: string }) => {
      setColumns(prev => {
        const next = prev.map(col => ({ ...col, notes: [...col.notes] }))

        if (event === 'DELETE') {
          return next.map(col => ({
            ...col,
            notes: col.notes.filter(n => n.id !== note.id),
          }))
        }

        if (event === 'INSERT') {
          // Annotate is_mine / can_mark_done for current user
          const enriched: NoteSafe = {
            ...(note as NoteSafe),
            is_mine:       false, // Realtime doesn't reveal author — use is_mine from API
            can_mark_done: note.recipient_id === currentUserId,
            can_edit:      false,
          }
          const colIdx = next.findIndex(c => c.member.profile_id === note.recipient_id)
          if (colIdx !== -1) next[colIdx].notes.push(enriched)
          return next
        }

        // UPDATE
        return next.map(col => ({
          ...col,
          notes: col.notes.map(n =>
            n.id === note.id ? { ...n, ...note } : n
          ),
        }))
      })
    },
    [currentUserId]
  )

  useBoardRealtime({
    teamId:       boardState.team.id,
    onNoteChange: handleNoteChange,
  })

  // ── dnd-kit sensors ───────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Drag handlers ─────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    const note = columns.flatMap(c => c.notes).find(n => n.id === active.id)
    setActiveNote(note ?? null)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return

    const activeColIdx = columns.findIndex(c => c.notes.some(n => n.id === active.id))
    const overColIdx   = columns.findIndex(
      c => c.member.profile_id === over.id || c.notes.some(n => n.id === over.id)
    )

    if (activeColIdx === -1 || overColIdx === -1 || activeColIdx === overColIdx) return

    // Prevent moving to own column
    if (columns[overColIdx].isMyColumn) return

    setColumns(prev => {
      const next     = prev.map(c => ({ ...c, notes: [...c.notes] }))
      const [moved]  = next[activeColIdx].notes.splice(
        next[activeColIdx].notes.findIndex(n => n.id === active.id), 1
      )
      next[overColIdx].notes.push({ ...moved, recipient_id: prev[overColIdx].member.profile_id })
      return next
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveNote(null)
    if (!over) return

    const activeColIdx = columns.findIndex(c => c.notes.some(n => n.id === active.id))
    const overColIdx   = columns.findIndex(
      c => c.member.profile_id === over.id || c.notes.some(n => n.id === over.id)
    )

    if (activeColIdx === -1) return

    if (activeColIdx === overColIdx) {
      // Reorder within same column
      setColumns(prev => {
        const next     = prev.map(c => ({ ...c, notes: [...c.notes] }))
        const col      = next[activeColIdx]
        const oldIndex = col.notes.findIndex(n => n.id === active.id)
        const newIndex = col.notes.findIndex(n => n.id === over.id)
        if (oldIndex === newIndex) return prev
        col.notes = arrayMove(col.notes, oldIndex, newIndex)
        // Persist positions
        startTransition(() => {
          reorderNotes(col.notes.map((n, i) => ({ id: n.id, position: i })))
        })
        return next
      })
    } else if (overColIdx !== -1 && !columns[overColIdx].isMyColumn) {
      // Cross-column move — persist to server
      const newRecipientId = columns[overColIdx].member.profile_id
      startTransition(() => {
        moveNote(active.id as string, newRecipientId, boardState.team.id)
      })
    }
  }

  // ── Note added callback (optimistic) ─────────────────────

  function handleNoteAdded(note: NoteSafe) {
    setColumns(prev =>
      prev.map(col =>
        col.member.profile_id === note.recipient_id
          ? { ...col, notes: [...col.notes, note] }
          : col
      )
    )
  }

  // ── Metrics ───────────────────────────────────────────────

  const allNotes  = columns.flatMap(c => c.notes)
  const doneCount = allNotes.filter(n => n.done).length

  return (
    <div>
      <MetricsBar
        totalNotes={allNotes.length}
        doneNotes={doneCount}
        memberCount={columns.length}
        cycleName={boardState.cycle?.name ?? null}
      />

      <div className="overflow-x-auto px-4 py-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 min-w-max">
            {columns.map(col => (
              <SortableContext
                key={col.member.profile_id}
                items={col.notes.map(n => n.id)}
                strategy={verticalListSortingStrategy}
              >
                <BoardColumn
                  column={col}
                  currentUserId={currentUserId}
                  onAddNote={() =>
                    setAddModalFor({
                      recipientId:   col.member.profile_id,
                      recipientName: col.member.profile.full_name,
                    })
                  }
                />
              </SortableContext>
            ))}
          </div>

          <DragOverlay>
            {activeNote && (
              <NoteCard
                note={activeNote}
                currentUserId={currentUserId}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {addModalFor && (
        <AddNoteModal
          teamId={boardState.team.id}
          cycleId={boardState.cycle?.id}
          recipientId={addModalFor.recipientId}
          recipientName={addModalFor.recipientName}
          onClose={() => setAddModalFor(null)}
          onSuccess={(note) => {
            handleNoteAdded(note)
            setAddModalFor(null)
          }}
        />
      )}
    </div>
  )
}
