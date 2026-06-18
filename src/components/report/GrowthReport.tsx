// src/components/report/GrowthReport.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ScoreRing } from './ScoreRing'
import { Radar } from './Radar'
import { useToast } from '@/components/shared/ToastProvider'
import { generateGrowthReport, type GrowthReportAI } from '@/server/actions/growth'
import { COMPETENCY_META, scoreLabel, type GrowthScores, type ScoredNote } from '@/lib/growth/score'
import type { NoteTag, FeedbackCycle } from '@/lib/types'
import { cn } from '@/lib/utils'

interface GrowthReportProps {
  name:          string
  teamName:      string
  teamId:        string
  cycles:        FeedbackCycle[]
  activeCycleId: string | null
  scores:        GrowthScores
  generatedOn:   string   // pre-formatted date (server-rendered to avoid hydration drift)
}

const VERDICT_STYLE: Record<string, string> = {
  strength: 'bg-accent text-accent-foreground border-[#5DCAA5]',
  solid:    'bg-muted text-muted-foreground border-border',
  focus:    'bg-[#FBF0E2] text-[#854F0B] border-[#F5E0B8]',
}

export function GrowthReport({
  name, teamName, teamId, cycles, activeCycleId, scores, generatedOn,
}: GrowthReportProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [report, setReport]   = useState<GrowthReportAI | null>(null)
  const [error, setError]     = useState('')
  const [isPending, start]    = useTransition()

  const enoughData = scores.totalNotes >= 2

  function handleGenerate() {
    setError('')
    start(async () => {
      try {
        const r = await generateGrowthReport({ teamId, cycleId: activeCycleId })
        setReport(r)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to generate report'
        setError(msg)
        toast(msg, 'error')
      }
    })
  }

  function copyForManager() {
    if (!report) return
    const lines = [
      `Growth summary — ${name} · ${teamName}`,
      '',
      report.summary,
      '',
      'Scores:',
      ...scores.competencies.filter(c => c.score !== null).map(c => `• ${COMPETENCY_META[c.key].label}: ${c.score}/100`),
      '',
      report.managerNote,
    ]
    navigator.clipboard?.writeText(lines.join('\n')).then(
      () => toast('Manager summary copied'),
      () => toast('Could not copy', 'error'),
    )
  }

  return (
    <div className="mx-auto max-w-[860px] px-4 py-6">

      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5 print:hidden">
          {cycles.map(c => (
            <button
              key={c.id}
              onClick={() => router.push(`/report/${teamId}?cycle=${c.id}`)}
              className={cn(
                'rounded-[20px] px-3 py-1 text-xs font-mono cursor-pointer',
                c.id === activeCycleId
                  ? 'border-[1.5px] border-primary bg-accent text-accent-foreground'
                  : 'border border-border bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {c.name}
              {c.status === 'active' && <span className="ml-1.5 inline-block h-[5px] w-[5px] rounded-full bg-primary align-middle" />}
            </button>
          ))}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between rounded-[16px] border border-border bg-card p-6 [animation:slideUp_.35s_ease_both]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <i className="ti ti-chart-radar text-[13px] text-primary" aria-hidden="true" />
            Growth report · private to you
          </div>
          <h1 className="text-[26px] font-medium leading-tight tracking-tight">{name}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {teamName} · {cycles.find(c => c.id === activeCycleId)?.name ?? 'All feedback'} · as of {generatedOn}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono text-muted-foreground">
            <span className="rounded-[20px] bg-muted px-2.5 py-1">{scores.totalNotes} notes received</span>
            <span className="rounded-[20px] bg-muted px-2.5 py-1">{scores.actioned} actioned</span>
            <span className="rounded-[20px] bg-muted px-2.5 py-1">{scores.strengthNotes.length} strengths · {scores.growthNotes.length} growth</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ScoreRing score={scores.overall} label={scoreLabel(scores.overall)} />
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">overall</span>
        </div>
      </header>

      {!enoughData ? (
        <div className="mt-4 rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
          <i className="ti ti-seedling text-[28px] text-primary/50" aria-hidden="true" />
          <p className="mx-auto mt-3 max-w-sm text-[13px] text-muted-foreground">
            Your report unlocks once you&apos;ve received at least 2 pieces of feedback this cycle. Ask your team for a few notes on the board.
          </p>
        </div>
      ) : (
        <>
          {/* ── Scorecard: radar + bars ───────────────────────── */}
          <section className="mt-4 grid items-center gap-6 rounded-[16px] border border-border bg-card p-6 md:grid-cols-[300px_1fr] [animation:slideUp_.35s_ease_both] [animation-delay:60ms]">
            <div className="flex items-center justify-center md:border-r md:border-border md:pr-6">
              <Radar competencies={scores.competencies} />
            </div>
            <div className="flex flex-col justify-center gap-3.5">
              <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Competency scorecard</h2>
              {scores.competencies.map(c => {
                const meta = COMPETENCY_META[c.key]
                return (
                  <div key={c.key} className="flex items-center gap-3">
                    <div className="flex w-[108px] shrink-0 items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                      <span className="truncate text-[12px] text-foreground" title={meta.blurb}>{meta.label}</span>
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${c.score ?? 0}%`, background: meta.color, transition: 'width .9s cubic-bezier(.22,1,.36,1)' }}
                      />
                    </div>
                    <span className="w-[58px] shrink-0 text-right font-mono text-[12px]" style={{ color: c.score === null ? '#a0a09d' : meta.color }}>
                      {c.score === null ? '—' : c.score}
                      <span className="ml-1 text-[10px] text-muted-foreground">{c.mentions > 0 ? `·${c.mentions}` : ''}</span>
                    </span>
                  </div>
                )
              })}
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground/80">
                Each score blends the strength vs. growth notes tagged to that competency, weighted by peer agreement (+1s) and smoothed for small samples — so one note never reads as a hard 0 or 100. Higher is stronger.
              </p>
              {scores.uncategorized > 0 && (
                <p className="text-[10.5px] leading-relaxed text-muted-foreground/80">
                  <i className="ti ti-info-circle mr-1 text-[11px]" aria-hidden="true" />
                  {scores.uncategorized} note{scores.uncategorized > 1 ? 's' : ''} weren&apos;t tagged to a competency, so {scores.uncategorized > 1 ? 'they count' : 'it counts'} toward your overall score but not a specific bar.
                </p>
              )}
            </div>
          </section>

          {/* ── Strengths & growth ────────────────────────────── */}
          <section className="mt-4 grid gap-4 md:grid-cols-2 [animation:slideUp_.35s_ease_both] [animation-delay:120ms]">
            <NotePanel
              title="What you're great at"
              icon="ti-star"
              accent="#0F6E56"
              tint="bg-[#d8eee7] border-[#9FE0CC]"
              notes={scores.strengthNotes}
              empty="No strength notes yet."
            />
            <NotePanel
              title="Where to grow"
              icon="ti-target-arrow"
              accent="#854F0B"
              tint="bg-[#FBF3E6] border-[#F0DCB8]"
              notes={scores.growthNotes}
              empty="No growth notes yet — nice."
            />
          </section>

          {/* ── AI report + action plan ───────────────────────── */}
          <section className="mt-4 rounded-[16px] border border-border bg-card p-6 [animation:slideUp_.35s_ease_both] [animation-delay:180ms]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[14px] font-medium">
                <i className="ti ti-sparkles text-[16px] text-primary" aria-hidden="true" />
                AI report & action plan
              </h2>
              {report && (
                <div className="flex items-center gap-2 print:hidden">
                  <button onClick={copyForManager} className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground">
                    <i className="ti ti-clipboard-text text-[13px]" aria-hidden="true" /> Copy for manager
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground">
                    <i className="ti ti-printer text-[13px]" aria-hidden="true" /> Export PDF
                  </button>
                </div>
              )}
            </div>

            {!report && (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-border bg-muted/40 px-6 py-8 text-center print:hidden">
                <p className="max-w-md text-[13px] text-muted-foreground">
                  Turn your {scores.totalNotes} notes into an honest summary, a per-competency read, and a prioritised action plan you can act on and share with your manager.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
                >
                  <i className={cn('ti text-[15px]', isPending ? 'ti-loader-2 animate-spin' : 'ti-sparkles')} aria-hidden="true" />
                  {isPending ? 'Analysing your feedback…' : 'Generate AI report'}
                </button>
                {error && <span className="text-[12px] text-[#A32D2D]">{error}</span>}
              </div>
            )}

            {report && (
              <div className="mt-4 flex flex-col gap-5 [animation:fadeIn_.3s_ease]">
                <div>
                  <h3 className="text-[18px] font-medium leading-snug tracking-tight">{report.headline}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/80">{report.summary}</p>
                </div>

                {report.competencies.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    {report.competencies.map((c, i) => {
                      const meta = COMPETENCY_META[c.key as NoteTag]
                      return (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full" style={{ background: meta?.color ?? '#888' }} />
                          <p className="text-[13px] leading-relaxed text-foreground/85">
                            <span className="font-medium">{meta?.label ?? c.key}</span>
                            <span className={cn('mx-2 rounded-[20px] border px-1.5 py-px text-[10px] uppercase tracking-wide', VERDICT_STYLE[c.verdict] ?? VERDICT_STYLE.solid)}>{c.verdict}</span>
                            {c.insight}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {report.actionPlan.length > 0 && (
                  <div>
                    <h4 className="mb-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Action plan</h4>
                    <ol className="flex flex-col gap-2.5">
                      {report.actionPlan.map((a, i) => {
                        const meta = COMPETENCY_META[a.competency as NoteTag]
                        return (
                          <li key={i} className="flex gap-3 rounded-[12px] border border-border bg-muted/40 p-3.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[12px] text-white">{i + 1}</span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-medium">{a.title}</span>
                                {meta && (
                                  <span className="rounded-[20px] px-1.5 py-px text-[10px] font-mono" style={{ background: `${meta.color}1A`, color: meta.color }}>{meta.label}</span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[12px] text-muted-foreground">{a.rationale}</p>
                              <p className="mt-1.5 text-[12px] text-foreground/80">
                                <span className="text-muted-foreground">First step — </span>{a.firstStep}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                )}

                {report.managerNote && (
                  <div className="rounded-[12px] border-l-2 border-primary bg-accent/30 px-4 py-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-accent-foreground">
                      <i className="ti ti-message-2 text-[12px]" aria-hidden="true" /> Share with your manager
                    </div>
                    <p className="text-[13px] leading-relaxed text-foreground/85">{report.managerNote}</p>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="self-start text-[12px] text-muted-foreground hover:text-foreground print:hidden disabled:opacity-60"
                >
                  <i className={cn('ti mr-1 text-[12px]', isPending ? 'ti-loader-2 animate-spin' : 'ti-refresh')} aria-hidden="true" />
                  {isPending ? 'Regenerating…' : 'Regenerate'}
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

// ── A list of feedback quotes (strengths or growth) ──────────
function NotePanel({
  title, icon, accent, tint, notes, empty,
}: {
  title: string; icon: string; accent: string; tint: string; notes: ScoredNote[]; empty: string
}) {
  return (
    <div className={cn('rounded-[16px] border bg-card p-5', tint)}>
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-medium" style={{ color: accent }}>
        <i className={cn('ti text-[15px]', icon)} aria-hidden="true" /> {title}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{notes.length}</span>
      </h3>
      {notes.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {notes.slice(0, 6).map(n => (
            <li key={n.id} className="rounded-[10px] bg-white/60 px-3 py-2.5">
              <p className="text-[12.5px] leading-relaxed text-foreground/85">{n.content}</p>
              <div className="mt-1.5 flex items-center gap-2">
                {n.primaryTag && (
                  <span
                    className="rounded-[20px] px-1.5 py-px text-[10px] font-mono"
                    style={{ background: `${COMPETENCY_META[n.primaryTag].color}1A`, color: COMPETENCY_META[n.primaryTag].color }}
                  >
                    {COMPETENCY_META[n.primaryTag].label}
                  </span>
                )}
                {n.votes > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
                    <i className="ti ti-thumb-up text-[11px]" aria-hidden="true" />{n.votes}
                  </span>
                )}
                {n.done && (
                  <span className="flex items-center gap-0.5 text-[10px] font-mono text-[#0F6E56]">
                    <i className="ti ti-circle-check text-[11px]" aria-hidden="true" />actioned
                  </span>
                )}
              </div>
            </li>
          ))}
          {notes.length > 6 && (
            <li className="text-[11px] text-muted-foreground">+{notes.length - 6} more</li>
          )}
        </ul>
      )}
    </div>
  )
}
