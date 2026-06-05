// src/components/admin/ModerationQueue.tsx
'use client'

import { useState, useTransition } from 'react'
import { moderateNote }            from '@/server/actions/notes'
import { cn }                      from '@/lib/utils'

interface Report {
  id:          string
  reason:      string
  created_at:  string
  profiles:    { full_name: string; email: string }
  notes_admin: {
    id:             string
    content:        string
    note_type:      string
    tags:           string[]
    author_name:    string
    author_email:   string
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
  const [isPending, startTransition] = useTransition()

  function handleAction(reportId: string, action: 'dismiss' | 'remove') {
    startTransition(async () => {
      await moderateNote(reportId, action, adminNote[reportId])
      setReports(prev => prev.filter(r => r.id !== reportId))
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
        const note = report.notes_admin
        return (
          <div key={report.id} className="border border-border rounded-[12px] overflow-hidden">
            {/* Report header */}
            <div className="px-[14px] py-[10px] bg-[#FAECE7] border-b border-[#F5C4B3] flex items-start gap-[10px]">
              <i className="ti ti-flag text-[14px] text-[#993C1D] mt-[2px]" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-[12px] font-medium text-[#993C1D] mb-[2px]">
                  Reported by {report.profiles.full_name}
                </div>
                <div className="text-[12px] text-[#712B13]">
                  Reason: {report.reason}
                </div>
              </div>
              <div className="text-[11px] text-[#993C1D] font-mono">
                {new Date(report.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Note content — author visible to admin only */}
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

                {/* Admin-only author info */}
                <div className="grid grid-cols-2 gap-2 px-[10px] py-2 bg-[#FAEEDA] rounded-lg border border-[#FAC775]">
                  <div>
                    <div className="text-[10px] text-[#854F0B] font-mono mb-[2px]">
                      AUTHOR (admin only)
                    </div>
                    <div className="text-[12px] text-[#633806] font-medium">{note.author_name}</div>
                    <div className="text-[11px] text-[#854F0B]">{note.author_email}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#854F0B] font-mono mb-[2px]">
                      RECIPIENT
                    </div>
                    <div className="text-[12px] text-[#633806] font-medium">{note.recipient_name}</div>
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
