// src/components/admin/CycleManager.tsx
'use client'

import { useState, useTransition } from 'react'
import { openCycle, closeCycleAction } from '@/server/actions/cycles'
import type { FeedbackCycle } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CycleManagerProps {
  teams:  { id: string; name: string }[]
  cycles: (FeedbackCycle & { teams: { name: string } })[]
}

const STATUS_STYLES = {
  active:   { bg: '#E1F5EE', color: '#0F6E56', dot: '#1D9E75' },
  closed:   { bg: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', dot: 'var(--color-border-secondary)' },
  archived: { bg: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)',  dot: 'var(--color-border-tertiary)'  },
}

export function CycleManager({ teams, cycles }: CycleManagerProps) {
  const [creating,     setCreating]     = useState(false)
  const [cycleName,    setCycleName]    = useState('')
  const [teamId,       setTeamId]       = useState(teams[0]?.id ?? '')
  const [confirmClose, setConfirmClose] = useState<string | null>(null)
  const [isPending,    startTransition] = useTransition()

  function handleCreate() {
    if (!cycleName.trim() || !teamId) return
    startTransition(async () => {
      await openCycle({ teamId, name: cycleName.trim() })
      setCycleName('')
      setCreating(false)
    })
  }

  function handleClose(cycleId: string) {
    startTransition(async () => {
      await closeCycleAction(cycleId)
      setConfirmClose(null)
    })
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div>
      {/* Create new cycle */}
      <div className="border border-border rounded-[12px] mb-4 overflow-hidden">
        <div
          className={cn(
            'px-[14px] py-[10px] bg-muted flex items-center justify-between',
            creating ? 'border-b border-border' : 'border-b-0',
          )}
        >
          <span className="text-[13px] font-medium">Open a new cycle</span>
          <button
            onClick={() => setCreating(v => !v)}
            className={cn(
              'py-[5px] px-3 text-xs rounded-lg border border-border cursor-pointer',
              creating
                ? 'bg-background text-muted-foreground'
                : 'bg-primary text-white border-primary',
            )}
          >
            {creating ? 'Cancel' : '+ New cycle'}
          </button>
        </div>

        {creating && (
          <div className="p-[14px]">
            <div className="grid grid-cols-2 gap-[10px] mb-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-[5px]">
                  Team
                </label>
                <select
                  value={teamId}
                  onChange={e => setTeamId(e.target.value)}
                  className="w-full text-[13px] py-[7px] px-[10px] border border-border rounded-lg bg-background text-foreground"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-[5px]">
                  Cycle name
                </label>
                <input
                  value={cycleName}
                  onChange={e => setCycleName(e.target.value)}
                  placeholder="e.g. Sprint 6, Q3 Retro..."
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="w-full text-[13px] py-[7px] px-[10px] border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!cycleName.trim() || !teamId || isPending}
              className={cn(
                'py-[7px] px-4 text-[13px] rounded-lg border-none bg-primary text-white font-medium',
                cycleName.trim() ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50',
              )}
            >
              Open cycle
            </button>
          </div>
        )}
      </div>

      {/* Cycle list */}
      <div className="flex flex-col gap-2">
        {cycles.map(cycle => {
          const s = STATUS_STYLES[cycle.status]
          return (
            <div key={cycle.id} className="border border-border rounded-[10px] py-3 px-[14px] flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{cycle.name}</span>
                  <span
                    className="text-[11px] py-px px-2 rounded-[20px] flex items-center gap-1 font-mono"
                    style={{ background: s.bg, color: s.color }}
                  >
                    <span
                      className="w-[5px] h-[5px] rounded-full inline-block"
                      style={{ background: s.dot }}
                    />
                    {cycle.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex gap-3">
                  <span><i className="ti ti-users text-xs mr-1" aria-hidden="true" />{(cycle.teams as any).name}</span>
                  <span><i className="ti ti-calendar text-xs mr-1" aria-hidden="true" />{formatDate(cycle.starts_at)}</span>
                  {cycle.closed_at && <span>Closed {formatDate(cycle.closed_at)}</span>}
                </div>
              </div>

              {cycle.status === 'active' && (
                confirmClose === cycle.id ? (
                  <div className="flex gap-[6px] items-center">
                    <span className="text-xs text-muted-foreground">
                      Close and generate AI summaries?
                    </span>
                    <button onClick={() => handleClose(cycle.id)} disabled={isPending} className="py-1 px-[10px] text-xs rounded-md border-none bg-primary text-white cursor-pointer">
                      Confirm
                    </button>
                    <button onClick={() => setConfirmClose(null)} className="py-1 px-[10px] text-xs rounded-md border border-border bg-transparent cursor-pointer text-muted-foreground">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClose(cycle.id)}
                    className="py-[5px] px-3 text-xs rounded-lg border border-border bg-transparent cursor-pointer text-muted-foreground flex items-center gap-[5px]"
                  >
                    <i className="ti ti-lock text-xs" aria-hidden="true" />
                    Close cycle
                  </button>
                )
              )}
            </div>
          )
        })}

        {cycles.length === 0 && (
          <div className="border border-dashed border-border rounded-[10px] p-8 text-center text-muted-foreground/70 text-[13px]">
            No cycles yet. Open one above to start collecting feedback.
          </div>
        )}
      </div>
    </div>
  )
}
