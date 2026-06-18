// ============================================================
// TeamPulse — BoardView (Client Component)
// src/components/board/BoardView.tsx
//
// Kanban board with dnd-kit. Other members' columns are read-only
// (you can write feedback on them but not drag their notes). Your
// own received feedback lives in a pinned column on the right, and a
// "Done" drop zone sits beside it — drag a received note into Done to
// action it (or back out to un-do). You can only ever drag YOUR notes.
// ============================================================

'use client'

import { useState, useCallback, useTransition, type ReactNode } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'

import { BoardColumn } from './BoardColumn'
import { NoteCard } from './NoteCard'
import { AddNoteModal } from './AddNoteModal'
import { GiveFeedbackPicker } from './GiveFeedbackPicker'
import { MetricsBar } from './MetricsBar'
import { Avatar } from '@/components/shared/Avatar'
import { useBoardRealtime } from '@/lib/hooks/use-board-realtime'
import { reorderNotes, updateNoteState } from '@/server/actions/notes'
import { cn } from '@/lib/utils'

import type { BoardState, NoteSafe, NoteEvidence } from '@/lib/types'

const PRIORITY_ZONE_ID = 'priority-zone'
const DONE_ZONE_ID = 'done-zone'

// Newest feedback first (descending by creation time).
const byNewest = (a: NoteSafe, b: NoteSafe) => (b.created_at ?? '').localeCompare(a.created_at ?? '')

interface BoardViewProps {
  boardState: BoardState
  currentUserId: string
}

export function BoardView({ boardState, currentUserId }: BoardViewProps) {
  const [columns, setColumns] = useState(boardState.columns)
  const [activeNote, setActiveNote] = useState<NoteSafe | null>(null)
  const [addModalFor, setAddModalFor] = useState<{ recipientId: string; recipientName: string } | null>(null)
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set())
  // Team feedback is expanded by default; collapse to focus on your own area.
  const [showPeers, setShowPeers] = useState(true)
  // Drives the "needs evidence" shake on a card whose drag-to-Done was blocked.
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null)
  const [, startTransition] = useTransition()

  // Bump a card's shake signal so NoteCard replays the alert animation.
  function triggerCardShake(id: string) {
    setShake(prev => ({ id, n: (prev?.id === id ? prev.n : 0) + 1 }))
  }

  // ── Realtime subscription ─────────────────────────────────

  const handleNoteChange = useCallback(
    (event: 'INSERT' | 'UPDATE' | 'DELETE', note: Partial<NoteSafe> & { id: string }) => {
      setColumns(prev => {
        const next = prev.map(col => ({ ...col, notes: [...col.notes] }))

        if (event === 'DELETE') {
          return next.map(col => ({ ...col, notes: col.notes.filter(n => n.id !== note.id) }))
        }

        if (event === 'INSERT') {
          // Skip if we already have it (optimistic insert by the author)
          if (next.some(c => c.notes.some(n => n.id === note.id))) return next
          const enriched: NoteSafe = {
            ...(note as NoteSafe),
            is_mine: false,
            can_mark_done: note.recipient_id === currentUserId,
            can_edit: false,
          }
          const colIdx = next.findIndex(c => c.member.profile_id === note.recipient_id)
          if (colIdx !== -1) next[colIdx].notes.push(enriched)
          return next
        }

        // UPDATE
        return next.map(col => ({
          ...col,
          notes: col.notes.map(n => (n.id === note.id ? { ...n, ...note } : n)),
        }))
      })
    },
    [currentUserId]
  )

  useBoardRealtime({ teamId: boardState.team.id, onNoteChange: handleNoteChange })

  // ── Derived lanes ─────────────────────────────────────────

  const myColumn = columns.find(c => c.isMyColumn)
  const otherColumns = columns.filter(c => !c.isMyColumn)
  const myProfileId = myColumn?.member.profile_id
  // Inbox & Done show newest first; Priorities keeps the user's manual ranking.
  const myInbox = (myColumn?.notes ?? []).filter(n => !n.done && !n.priority).sort(byNewest)
  const myPriorities = (myColumn?.notes ?? []).filter(n => !n.done && n.priority)
  const myDone = (myColumn?.notes ?? []).filter(n => n.done).sort(byNewest)

  // ── dnd-kit sensors ───────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Optimistic helpers ────────────────────────────────────

  function patchNoteState(id: string, patch: { done?: boolean; priority?: boolean }) {
    setColumns(prev => prev.map(c =>
      c.isMyColumn
        ? { ...c, notes: c.notes.map(n => (n.id === id ? { ...n, ...patch } : n)) }
        : c
    ))
  }

  // Keep BoardView's copy of a note's evidence in sync with the card, so the
  // drag-to-Done gate always sees the latest proof the recipient added.
  function handleEvidenceChange(noteId: string, evidence: NoteEvidence[]) {
    setColumns(prev => prev.map(c =>
      c.isMyColumn
        ? { ...c, notes: c.notes.map(n => (n.id === noteId ? { ...n, evidence } : n)) }
        : c
    ))
  }

  // Star toggle from a note: move it to / from Priorities immediately
  // (optimistic) and show a spinner on that note until the server confirms.
  function handleSetPriority(noteId: string, priority: boolean) {
    const patch = priority ? { priority: true, done: false } : { priority: false }
    patchNoteState(noteId, patch)
    setSavingIds(prev => new Set(prev).add(noteId))
    updateNoteState(noteId, patch).finally(() => {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(noteId)
        return next
      })
    })
  }

  function persistReorder(list: NoteSafe[], activeId: string, overId: string) {
    const oldIndex = list.findIndex(n => n.id === activeId)
    const isZone = overId === myProfileId || overId === DONE_ZONE_ID || overId === PRIORITY_ZONE_ID
    const newIndex = isZone
      ? list.length - 1
      : list.findIndex(n => n.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
    const reordered = arrayMove(list, oldIndex, newIndex)

    setColumns(prev => prev.map(c => {
      if (!c.isMyColumn) return c
      const reorderedIds = new Set(reordered.map(n => n.id))
      const rest = c.notes.filter(n => !reorderedIds.has(n.id))
      return { ...c, notes: [...reordered, ...rest] }
    }))
    startTransition(() => {
      reorderNotes(reordered.map((n, i) => ({ id: n.id, position: i })))
    })
  }

  // ── Drag handlers ─────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    const note = (myColumn?.notes ?? []).find(n => n.id === active.id)
    setActiveNote(note ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveNote(null)
    if (!over || !myColumn) return

    // Only the recipient's own notes are draggable.
    const note = myColumn.notes.find(n => n.id === active.id)
    if (!note) return

    const overId = over.id as string
    const inboxIds = new Set(myInbox.map(n => n.id))
    const priorityIds = new Set(myPriorities.map(n => n.id))
    const doneIds = new Set(myDone.map(n => n.id))

    let dest: 'inbox' | 'priority' | 'done' | null = null
    if (overId === DONE_ZONE_ID || doneIds.has(overId)) dest = 'done'
    else if (overId === PRIORITY_ZONE_ID || priorityIds.has(overId)) dest = 'priority'
    else if (overId === myProfileId || inboxIds.has(overId)) dest = 'inbox'
    if (!dest) return

    const curLane: 'inbox' | 'priority' | 'done' =
      note.done ? 'done' : note.priority ? 'priority' : 'inbox'

    if (dest === curLane) {
      const list = dest === 'done' ? myDone : dest === 'priority' ? myPriorities : myInbox
      persistReorder(list, note.id, overId)
      return
    }

    // A note can only move to Done once the recipient has logged evidence.
    if (dest === 'done' && (note.evidence?.length ?? 0) === 0) {
      triggerCardShake(note.id)
      return
    }

    // Lane change — set the exact target state for the destination lane.
    const target =
      dest === 'done' ? { done: true } :
        dest === 'priority' ? { done: false, priority: true } :
          { done: false, priority: false }
    patchNoteState(note.id, target)
    startTransition(() => { updateNoteState(note.id, target) })
  }

  // ── Note added (optimistic) ───────────────────────────────

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

  const allNotes = columns.flatMap(c => c.notes)
  const doneCount = allNotes.filter(n => n.done).length

  return (
    <div>
      <MetricsBar
        totalNotes={allNotes.length}
        doneNotes={doneCount}
        memberCount={columns.length}
        cycleName={boardState.cycle?.name ?? null}
      />

      <div className="mx-auto max-w-[1200px] px-4 py-3">
        {/* Give feedback — searchable teammate picker (scales to any team size) */}
        {otherColumns.length > 0 && (
          <div className="mb-4">
            <GiveFeedbackPicker
              peers={otherColumns}
              onPick={(recipientId, recipientName) => setAddModalFor({ recipientId, recipientName })}
            />
          </div>
        )}

        <DndContext
          id="teampulse-board"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Your area — the hero: Received / Priorities / Done, full width. */}
          <div className="rounded-[14px] bg-[#e8e6dc] p-4">
            <div className="mb-3 flex items-center gap-2 px-1">
              <i className="ti ti-inbox text-[15px] text-foreground/70" aria-hidden="true" />
              <h3 className="m-0 text-[13px] font-medium">Your feedback</h3>
              <span className="text-[11px] text-muted-foreground">· drag between lanes to organise</span>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              {/* Inbox — received feedback. Star or drag into Priorities. */}
              {myColumn && myProfileId && (
                <DropLane
                  id={myProfileId}
                  notes={myInbox}
                  currentUserId={currentUserId}
                  onSetPriority={handleSetPriority}
                  savingIds={savingIds}
                  shake={shake}
                  onEvidenceChange={handleEvidenceChange}
                  accent
                  header={
                    <div className="px-3 pt-2.5 pb-[9px] border-b border-border flex items-center gap-[9px] bg-accent/50 rounded-t-[12px]">
                      <Avatar name={myColumn.member.profile.full_name} size={30} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[5px]">
                          <h4 className="text-[13px] font-medium m-0">You</h4>
                          <span className="text-xs px-1.5 py-px rounded-[20px] bg-primary/15 text-primary border border-primary/30 shrink-0">
                            Received
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground m-0">
                          {myInbox.length === 0 ? 'No open feedback' : `${myInbox.length} to review`}
                        </p>
                      </div>
                    </div>
                  }
                  emptyHint="No open feedback"
                />
              )}

              {/* Priorities — your ranked objectives to resolve */}
              {myColumn && (
                <DropLane
                  id={PRIORITY_ZONE_ID}
                  notes={myPriorities}
                  currentUserId={currentUserId}
                  onSetPriority={handleSetPriority}
                  savingIds={savingIds}
                  shake={shake}
                  onEvidenceChange={handleEvidenceChange}
                  ranked
                  header={
                    <div className="px-3 pt-2.5 pb-[9px] border-b border-border flex items-center gap-[9px] bg-[#FAEEDA] rounded-t-[12px]">
                      <div className="w-[30px] h-[30px] rounded-full bg-[#F5E0B8] text-[#854F0B] flex items-center justify-center shrink-0">
                        <i className="ti ti-flag text-[16px]" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-medium m-0">Priorities</h4>
                        <p className="text-[11px] text-[#854F0B]/80 m-0">
                          {myPriorities.length === 0 ? 'Set objectives to resolve' : `${myPriorities.length} ranked`}
                        </p>
                      </div>
                    </div>
                  }
                  emptyHint="Star a note or drag it here to prioritise"
                />
              )}

              {/* Done zone */}
              {myColumn && (
                <DropLane
                  id={DONE_ZONE_ID}
                  notes={myDone}
                  currentUserId={currentUserId}
                  header={
                    <div className="px-3 pt-2.5 pb-[9px] border-b border-border flex items-center gap-[9px] bg-muted rounded-t-[12px]">
                      <div className="w-[30px] h-[30px] rounded-full bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center shrink-0">
                        <i className="ti ti-check text-[16px]" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-medium m-0">Done</h4>
                        <p className="text-[11px] text-muted-foreground m-0">
                          {myDone.length === 0 ? 'Drag feedback here' : `${myDone.length} actioned`}
                        </p>
                      </div>
                    </div>
                  }
                  emptyHint="Drag a note here to mark it done"
                  dashed
                />
              )}
            </div>
          </div>

          {/* Browse team feedback — peers collapsed by default to keep the
              board calm; expand on demand. Scrolls horizontally on overflow. */}
          {otherColumns.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowPeers(v => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground hover:text-foreground"
              >
                <i className={cn('ti text-[14px] transition-transform', showPeers ? 'ti-chevron-down' : 'ti-chevron-right')} aria-hidden="true" />
                Browse team feedback
                <span className="font-mono text-[11px] text-muted-foreground/70">{otherColumns.length}</span>
              </button>
              {showPeers && (
                <div className="mt-2 flex items-start gap-3 overflow-x-auto pb-2">
                  {otherColumns.map(col => (
                    <BoardColumn
                      key={col.member.profile_id}
                      column={{ ...col, notes: [...col.notes].sort(byNewest) }}
                      currentUserId={currentUserId}
                      onAddNote={() =>
                        setAddModalFor({
                          recipientId: col.member.profile_id,
                          recipientName: col.member.profile.full_name,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <DragOverlay>
            {activeNote && (
              <NoteCard note={activeNote} currentUserId={currentUserId} isDragging />
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

// ── A droppable + sortable lane (used for your column and the Done zone) ──

function DropLane({
  id, notes, currentUserId, header, emptyHint, accent, dashed, ranked, onSetPriority, savingIds,
  shake, onEvidenceChange,
}: {
  id: string
  notes: NoteSafe[]
  currentUserId: string
  header: ReactNode
  emptyHint: string
  accent?: boolean
  dashed?: boolean
  ranked?: boolean
  onSetPriority?: (noteId: string, priority: boolean) => void
  savingIds?: Set<string>
  shake?: { id: string; n: number } | null
  onEvidenceChange?: (noteId: string, evidence: NoteEvidence[]) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      className={cn(
        'flex-1 min-w-[240px] rounded-[12px] flex flex-col border',
        accent ? 'border-primary/40' : 'border-border',
        dashed && 'border-dashed',
        isOver ? 'bg-accent ring-2 ring-primary/50' : 'bg-background',
      )}
    >
      {header}
      <div ref={setNodeRef} className="p-2 flex flex-col gap-[6px] min-h-[140px]">
        <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
          {notes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-[6px] opacity-40 px-[8px] py-[24px] text-center">
              <i className="ti ti-inbox text-[22px] text-muted-foreground" aria-hidden="true" />
              <span className="text-[11px] text-muted-foreground">{emptyHint}</span>
            </div>
          ) : (
            notes.map((note, i) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUserId={currentUserId}
                rank={ranked ? i + 1 : undefined}
                onSetPriority={onSetPriority}
                saving={savingIds?.has(note.id)}
                shakeSignal={shake?.id === note.id ? shake.n : 0}
                onEvidenceChange={onEvidenceChange}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
