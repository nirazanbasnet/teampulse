// src/components/goals/CyclePulseHeader.tsx
'use client'

import { COMPETENCY_META } from '@/lib/growth/score'
import type { CyclePulse } from '@/lib/growth/goals'
import { cn } from '@/lib/utils'

interface CyclePulseHeaderProps {
  pulse:     CyclePulse
  name:      string
  teamName:  string
  cycleName: string | null
}

// The signature header: self-driven progress as one legible reading —
// average goal progress + a 5-dot competency-coverage row that mirrors
// the peer scorecard's competency bars.
export function CyclePulseHeader({ pulse, name, teamName, cycleName }: CyclePulseHeaderProps) {
  const hasData = pulse.goalCount > 0 || pulse.winCount > 0

  return (
    <header className="rounded-[16px] border border-border bg-card p-6 [animation:slideUp_.35s_ease_both]">
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <i className="ti ti-target text-[13px] text-primary" aria-hidden="true" />
        Goals &amp; wins · private to you
      </div>
      <h1 className="text-[24px] font-medium leading-tight tracking-tight">{name}</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {teamName} · {cycleName ?? 'No active cycle'}
      </p>

      {hasData ? (
        <>
          {/* Measurable strip */}
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px]">
            <Stat value={String(pulse.goalCount)} label={pulse.goalCount === 1 ? 'goal' : 'goals'} />
            <Stat value={pulse.avgProgress === null ? '—' : `${pulse.avgProgress}%`} label="avg progress" accent />
            <Stat value={String(pulse.achievedGoals)} label="achieved" />
            <Stat value={String(pulse.winCount)} label={pulse.winCount === 1 ? 'win' : 'wins'} />
          </div>

          {/* Competency coverage — which axes you're investing in this cycle */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {pulse.coverage.map(c => {
                const meta = COMPETENCY_META[c.key]
                return (
                  <span
                    key={c.key}
                    title={`${meta.label}: ${c.goals} goal${c.goals === 1 ? '' : 's'}, ${c.wins} win${c.wins === 1 ? '' : 's'}`}
                    className={cn('h-2.5 w-2.5 rounded-full transition-opacity', !c.covered && 'opacity-20')}
                    style={{ background: meta.color }}
                  />
                )
              })}
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              {pulse.coveredCount}/5 competencies in focus
            </span>
          </div>
        </>
      ) : (
        <p className="mt-4 text-[13px] text-muted-foreground">
          Set your first goal for this cycle, then log wins as you make progress.
        </p>
      )}
    </header>
  )
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <span className={cn('rounded-[20px] px-2.5 py-1', accent ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>
      <span className="font-medium text-foreground">{value}</span> {label}
    </span>
  )
}
