// src/components/analytics/AnalyticsDashboard.tsx
'use client'

import { useState }      from 'react'
import { useRouter }     from 'next/navigation'
import { TagBarChart }   from './TagBarChart'
import { TypeDonut }     from './TypeDonut'
import { CompletionTrend } from './CompletionTrend'
import { MemberStatRow } from './MemberStatRow'
import { Avatar }        from '@/components/shared/Avatar'
import type { Team, FeedbackCycle, TeamAnalytics } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AnalyticsDashboardProps {
  team:             Team
  cycles:           FeedbackCycle[]
  activeCycleId:    string | null
  analytics:        TeamAnalytics
  currentUserId:    string
  personalSummary:  string | null
  isAdmin:          boolean
}

export function AnalyticsDashboard({
  team, cycles, activeCycleId, analytics,
  currentUserId, personalSummary, isAdmin,
}: AnalyticsDashboardProps) {
  const router  = useRouter()
  const [tab, setTab] = useState<'team' | 'personal'>('team')

  const myStat = analytics.member_stats.find(s => s.profile.id === currentUserId)

  function switchCycle(id: string) {
    router.push(`/analytics/${team.id}?cycle=${id}`)
  }

  const statCards = [
    { label: 'Total notes',    value: analytics.total_notes,               icon: 'ti-note'      },
    { label: 'Completion',     value: `${analytics.completion_rate}%`,     icon: 'ti-check'     },
    { label: 'Done',           value: analytics.done_notes,                icon: 'ti-checkbox'  },
    { label: 'Participation',  value: `${Math.round(analytics.participation * 100)}%`, icon: 'ti-users' },
  ]

  return (
    <div className="p-4">

      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="flex gap-[6px] mb-4 flex-wrap">
          {cycles.map(c => (
            <button
              key={c.id}
              onClick={() => switchCycle(c.id)}
              className={cn(
                'py-[5px] px-3 rounded-[20px] text-[12px] cursor-pointer font-mono',
                c.id === activeCycleId
                  ? 'border-[1.5px] border-primary bg-accent text-accent-foreground'
                  : 'border border-border bg-transparent text-muted-foreground',
              )}
            >
              {c.name}
              {c.status === 'active' && (
                <span className="inline-block w-[5px] h-[5px] rounded-full bg-primary ml-[6px] align-middle" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-0 border-b border-border mb-5">
        {(['team', 'personal'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'py-[10px] px-4 text-[13px] bg-transparent border-none cursor-pointer capitalize',
              tab === t
                ? 'font-medium text-foreground border-b-2 border-primary'
                : 'font-normal text-muted-foreground border-b-2 border-transparent',
            )}
          >
            {t === 'personal' ? 'My insights' : 'Team overview'}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <>
          {/* Stat cards */}
          <div className="grid gap-[10px] mb-5 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
            {statCards.map(s => (
              <div key={s.label} className="bg-muted rounded-lg p-[14px]">
                <div className="text-[11px] text-muted-foreground mb-[6px] flex items-center gap-[5px]">
                  <i className={`ti ${s.icon} text-[13px]`} aria-hidden="true" />
                  {s.label}
                </div>
                <div className="text-[22px] font-medium">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid gap-4 mb-5 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
            <div className="border border-border rounded-[12px] p-4">
              <h3 className="text-[13px] font-medium mb-[14px]">Tag distribution</h3>
              <TagBarChart data={analytics.tag_distribution} />
            </div>
            <div className="border border-border rounded-[12px] p-4">
              <h3 className="text-[13px] font-medium mb-[14px]">Note types</h3>
              <TypeDonut data={analytics.type_distribution} total={analytics.total_notes} />
            </div>
          </div>

          {/* Member stats */}
          <div className="border border-border rounded-[12px] p-4 mb-5">
            <h3 className="text-[13px] font-medium mb-[14px]">Member activity</h3>
            <div className="flex flex-col gap-[6px]">
              {analytics.member_stats.map(stat => (
                <MemberStatRow
                  key={stat.profile.id}
                  stat={stat}
                  isMe={stat.profile.id === currentUserId}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'personal' && myStat && (
        <>
          {/* Personal stat cards */}
          <div className="grid gap-[10px] mb-5 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
            {[
              { label: 'Notes received',  value: myStat.notes_received  },
              { label: 'Actioned',        value: `${myStat.completion_rate}%` },
              { label: 'Strength notes',  value: analytics.member_stats.find(s => s.profile.id === currentUserId) ? 0 : 0 },
              { label: 'Growth notes',    value: 0 },
            ].map(s => (
              <div key={s.label} className="bg-muted rounded-lg p-[14px]">
                <div className="text-[11px] text-muted-foreground mb-[6px]">{s.label}</div>
                <div className="text-[22px] font-medium">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tag breakdown */}
          <div className="border border-border rounded-[12px] p-4 mb-4">
            <h3 className="text-[13px] font-medium mb-[14px]">Your feedback breakdown by category</h3>
            <TagBarChart data={myStat.tag_breakdown} color="#534AB7" />
          </div>

          {/* AI Summary */}
          {personalSummary ? (
            <div className="border border-[#AFA9EC] rounded-[12px] p-4 bg-[#EEEDFE]">
              <div className="flex items-center gap-2 mb-[10px]">
                <i className="ti ti-sparkles text-[16px] text-[#534AB7]" aria-hidden="true" />
                <h3 className="text-[13px] font-medium text-[#3C3489] m-0">
                  AI theme summary — private to you
                </h3>
              </div>
              <p className="text-[13px] text-[#3C3489] leading-[1.7] m-0">
                {personalSummary}
              </p>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-[12px] p-6 text-center text-muted-foreground/70 text-[13px]">
              <i className="ti ti-sparkles text-[24px] block mb-2 opacity-40" aria-hidden="true" />
              AI summary is generated when a cycle closes. Check back after {team.name}&apos;s current cycle ends.
            </div>
          )}
        </>
      )}
    </div>
  )
}
