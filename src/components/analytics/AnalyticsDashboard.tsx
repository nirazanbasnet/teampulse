// src/components/analytics/AnalyticsDashboard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TagBarChart } from './TagBarChart'
import { TypeDonut } from './TypeDonut'
import { MemberStatRow } from './MemberStatRow'
import { COMPETENCY_META, scoreLabel, type GrowthScores } from '@/lib/growth/score'
import type { Team, FeedbackCycle, TeamAnalytics } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AnalyticsDashboardProps {
  team: Team
  cycles: FeedbackCycle[]
  activeCycleId: string | null
  analytics: TeamAnalytics
  currentUserId: string
  personalSummary: string | null
  isAdmin: boolean
  teamScores?: GrowthScores | null
  myScores: GrowthScores
}

export function AnalyticsDashboard({
  team, cycles, activeCycleId, analytics,
  currentUserId, personalSummary, isAdmin, teamScores, myScores,
}: AnalyticsDashboardProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'team' | 'personal'>('team')

  const myStat = analytics.member_stats.find(s => s.profile.id === currentUserId)

  function switchCycle(id: string) {
    router.push(`/analytics/${team.id}?cycle=${id}`)
  }

  const statCards = [
    { label: 'Total notes', value: analytics.total_notes, icon: 'ti-note' },
    { label: 'Completion', value: `${analytics.completion_rate}%`, icon: 'ti-check' },
    { label: 'Done', value: analytics.done_notes, icon: 'ti-checkbox' },
    { label: 'Participation', value: `${Math.round(analytics.participation * 100)}%`, icon: 'ti-users' },
  ]

  return (
    <div className="mx-auto max-w-[1100px] p-4">

      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="flex gap-[6px] mb-4 flex-wrap">
          {cycles.map(c => (
            <button
              key={c.id}
              onClick={() => switchCycle(c.id)}
              className={cn(
                'py-1 px-3 rounded-[20px] text-xs cursor-pointer font-mono',
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
              'py-2.5 px-4 text-[13px] bg-transparent border-none cursor-pointer capitalize',
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
          <div className="grid gap-2.5 mb-5 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
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

          {/* Team competency health — where the team is strong / developing */}
          <div className="border border-border bg-card rounded-[12px] p-4 mb-5">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="text-[13px] font-medium">Team competency health</h3>
              <span className="font-mono text-[12px] text-muted-foreground">
                overall {teamScores?.overall ?? '—'} · {scoreLabel(teamScores?.overall ?? null)}
              </span>
            </div>
            {teamScores ? (
              <CompetencyBars scores={teamScores} />
            ) : (
              <div className="text-[12px] text-muted-foreground">No team competency scores available yet.</div>
            )}
            <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground/80">
              Per competency, the balance of strength vs. growth notes across the whole team (smoothed for small samples). Higher = the team is collectively strong here.
            </p>
          </div>

          {/* Charts row */}
          <div className="grid gap-4 mb-5 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
            <div className="border border-border bg-card rounded-[12px] p-4">
              <h3 className="text-[13px] font-medium mb-[14px]">Tag distribution</h3>
              <TagBarChart data={analytics.tag_distribution} />
            </div>
            <div className="border border-border bg-card rounded-[12px] p-4">
              <h3 className="text-[13px] font-medium mb-[14px]">Note types</h3>
              <TypeDonut data={analytics.type_distribution} total={analytics.total_notes} />
            </div>
          </div>

          {/* Member stats */}
          <div className="border border-border bg-card rounded-[12px] p-4 mb-5">
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
          {/* Full report CTA — the rich individual view lives on /report */}
          <Link
            href={`/report/${team.id}`}
            className="mb-4 flex items-center gap-3 rounded-[12px] border border-primary/40 bg-accent/40 p-4 no-underline transition-colors hover:bg-accent"
          >
            <i className="ti ti-chart-radar text-[20px] text-primary" aria-hidden="true" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-foreground">Open your full Growth Report</div>
              <div className="text-[12px] text-muted-foreground">Competency scorecard, AI insights &amp; a personalised action plan.</div>
            </div>
            <i className="ti ti-arrow-right text-[16px] text-primary" aria-hidden="true" />
          </Link>

          {/* Personal stat cards */}
          <div className="grid gap-2.5 mb-5 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
            {[
              { label: 'Notes received', value: myScores.totalNotes },
              { label: 'Actioned', value: `${myStat.completion_rate}%` },
              { label: 'Strengths', value: myScores.strengthNotes.length },
              { label: 'Growth areas', value: myScores.growthNotes.length },
            ].map(s => (
              <div key={s.label} className="bg-muted rounded-lg p-[14px]">
                <div className="text-[11px] text-muted-foreground mb-[6px]">{s.label}</div>
                <div className="text-[22px] font-medium">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Your competency scores */}
          <div className="border border-border bg-card rounded-[12px] p-4 mb-4">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="text-[13px] font-medium">Your competency scores</h3>
              <span className="font-mono text-[12px] text-muted-foreground">overall {myScores.overall ?? '—'}</span>
            </div>
            <CompetencyBars scores={myScores} />
          </div>

          {/* AI Summary */}
          {personalSummary ? (
            <div className="border border-[#AFA9EC] rounded-[12px] p-4 bg-[#EEEDFE]">
              <div className="flex items-center gap-2 mb-2.5">
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

// Horizontal competency bars, coloured to match the Growth Report / board.
function CompetencyBars({ scores }: { scores: GrowthScores }) {
  return (
    <div className="flex flex-col gap-3">
      {scores.competencies.map(c => {
        const meta = COMPETENCY_META[c.key]
        return (
          <div key={c.key} className="flex items-center gap-3">
            <div className="flex w-[112px] shrink-0 items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
              <span className="truncate text-[12px] text-foreground">{meta.label}</span>
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${c.score ?? 0}%`, background: meta.color, transition: 'width .9s cubic-bezier(.22,1,.36,1)' }}
              />
            </div>
            <span className="w-[52px] shrink-0 text-right font-mono text-[12px]" style={{ color: c.score === null ? '#a0a09d' : meta.color }}>
              {c.score === null ? '—' : c.score}
              <span className="ml-1 text-[10px] text-muted-foreground">{c.mentions > 0 ? `·${c.mentions}` : ''}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
