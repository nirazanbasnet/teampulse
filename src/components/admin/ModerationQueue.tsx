// src/components/admin/ModerationQueue.tsx
'use client'

import { useState, useTransition } from 'react'
import { moderateNote, revealNoteAuthor } from '@/server/actions/notes'
import { cn }                              from '@/lib/utils'

interface Report {
  id:          string
  reason:      string
  source:      string
  created_at:  string
  profiles:    { full_name: string; email: string } | null
  notes_admin: {
    id:             string
    content:        string
    note_type:      string
    tags:           string[]
    recipient_name: string
  }
}

interface ModerationQueueProps {
  reports: Report[]
}

const TYPE_COLORS: Record<string, string> = {
  general:  '#EAB308',
  strength: '#1D9E75',
  growth:   '#378ADD',
}

export function ModerationQueue({ reports: initialReports }: ModerationQueueProps) {
  const [reports,   setReports]   = useState(initialReports)
  const [adminNote, setAdminNote] = useState<Record<string, string>>({})
  const [revealed,  setRevealed]  = useState<Record<string, { author_name: string; author_email: string }>>({})
  const [busyId,    setBusyId]    = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAction(reportId: string, action: 'dismiss' | 'remove') {
    startTransition(async () => {
      await moderateNote(reportId, action, adminNote[reportId])
      setReports(prev => prev.filter(r => r.id !== reportId))
    })
  }

  function handleReveal(reportId: string) {
    setBusyId(reportId)
    startTransition(async () => {
      try {
        const author = await revealNoteAuthor(reportId)
        setRevealed(prev => ({ ...prev, [reportId]: author }))
      } catch (e) {
        console.error('Failed to reveal author:', e)
      } finally {
        setBusyId(null)
      }
    })
  }

  if (reports.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-[12px] p-12 text-center text-muted-foreground/70 text-sm">
        <i className="ti ti-shield-check block text-[32px] mb-[10px] opacity-40" aria-hidden="true" />
        No pending reports — all clear.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map(report => {
        const note    = report.notes_admin
        const isAi    = report.source === 'ai' || !report.profiles
        const author  = revealed[report.id]
        return (
          <div key={report.id} className="border border-border rounded-[12px] overflow-hidden">
            {/* Report header */}
            <div className={cn(
              'px-[14px] py-[10px] border-b flex items-start gap-[10px]',
              isAi ? 'bg-[#EEEDFE] border-[#D8D5F5]' : 'bg-[#FAECE7] border-[#F5C4B3]',
            )}>
              <i className={cn('ti text-[14px] mt-[2px]', isAi ? 'ti-robot text-[#534AB7]' : 'ti-flag text-[#993C1D]')} aria-hidden="true" />
              <div className="flex-1">
                <div className={cn('text-[12px] font-medium mb-[2px] flex items-center gap-[6px]', isAi ? 'text-[#534AB7]' : 'text-[#993C1D]')}>
                  {isAi ? 'Flagged by AI moderation' : `Reported by ${report.profiles?.full_name}`}
                  <span className={cn(
                    'text-[10px] px-[6px] py-px rounded-[20px] font-mono',
                    isAi ? 'bg-[#534AB7] text-white' : 'bg-[#993C1D] text-white',
                  )}>
                    {isAi ? 'AI' : 'member'}
                  </span>
                </div>
                <div className={cn('text-[12px]', isAi ? 'text-[#3C3489]' : 'text-[#712B13]')}>
                  Reason: {report.reason}
                </div>
              </div>
              <div className={cn('text-[11px] font-mono', isAi ? 'text-[#534AB7]' : 'text-[#993C1D]')}>
                {new Date(report.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="p-[14px]">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  {/* Dynamic: color comes from TYPE_COLORS map */}
                  <span
                    className="text-[10px] px-[7px] py-px rounded-[20px] font-mono"
                    style={{
                      background: `${TYPE_COLORS[note.note_type]}22`,
                      color:       TYPE_COLORS[note.note_type],
                      border:      `0.5px solid ${TYPE_COLORS[note.note_type]}44`,
                    }}
                  >
                    {note.note_type}
                  </span>
                  {note.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-[10px] px-[7px] py-px rounded-[20px] bg-muted text-muted-foreground font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Dynamic: left border color comes from TYPE_COLORS map */}
                <div
                  className="bg-muted rounded-lg px-3 py-[10px] text-[13px] text-foreground leading-[1.6] mb-[10px]"
                  style={{ borderLeft: `3px solid ${TYPE_COLORS[note.note_type]}` }}
                >
                  {note.content}
                </div>

                {/* Recipient (always visible) + reveal-on-demand author */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-[10px] py-2 bg-muted rounded-lg border border-border">
                    <div className="text-[10px] text-muted-foreground font-mono mb-[2px]">RECIPIENT</div>
                    <div className="text-[12px] text-foreground font-medium">{note.recipient_name}</div>
                  </div>

                  <div className="px-[10px] py-2 bg-[#FAEEDA] rounded-lg border border-[#FAC775]">
                    <div className="text-[10px] text-[#854F0B] font-mono mb-[4px]">AUTHOR</div>
                    {author ? (
                      <>
                        <div className="text-[12px] text-[#633806] font-medium">{author.author_name}</div>
                        <div className="text-[11px] text-[#854F0B]">{author.author_email}</div>
                        <div className="text-[10px] text-[#854F0B]/80 mt-[3px] flex items-center gap-1">
                          <i className="ti ti-history text-[11px]" aria-hidden="true" /> Revealed · recorded in audit log
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleReveal(report.id)}
                          disabled={isPending}
                          className="flex items-center gap-[5px] text-[12px] px-[10px] py-[4px] rounded-md border border-[#FAC775] bg-white text-[#854F0B] cursor-pointer hover:bg-[#FFF7E8]"
                        >
                          <i className={cn('ti text-[12px]', busyId === report.id ? 'ti-loader-2 animate-spin' : 'ti-eye')} aria-hidden="true" />
                          {busyId === report.id ? 'Revealing…' : 'Reveal author'}
                        </button>
                        <div className="text-[10px] text-[#854F0B]/80 mt-[4px]">
                          Anonymous by default. Revealing is recorded in the audit log.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin note */}
              <textarea
                value={adminNote[report.id] ?? ''}
                onChange={e => setAdminNote(prev => ({ ...prev, [report.id]: e.target.value }))}
                placeholder="Optional internal note (not shown to users)..."
                rows={2}
                className="w-full text-[12px] px-[10px] py-[7px] mb-[10px] border border-border rounded-lg bg-background text-foreground resize-none font-[inherit]"
              />

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(report.id, 'dismiss')}
                  disabled={isPending}
                  className="flex items-center gap-[5px] px-[14px] py-[6px] text-[12px] rounded-lg border border-border bg-transparent cursor-pointer text-muted-foreground"
                >
                  <i className="ti ti-x text-[13px]" aria-hidden="true" />
                  Dismiss report
                </button>
                <button
                  onClick={() => handleAction(report.id, 'remove')}
                  disabled={isPending}
                  className={cn(
                    'flex items-center gap-[5px] px-[14px] py-[6px] text-[12px] rounded-lg border-0 bg-[#A32D2D] text-white cursor-pointer font-medium',
                    isPending && 'opacity-50'
                  )}
                >
                  <i className="ti ti-trash text-[13px]" aria-hidden="true" />
                  Remove note
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
