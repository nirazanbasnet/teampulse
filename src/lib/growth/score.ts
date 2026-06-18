// ============================================================
// TeamPulse — Growth scoring model
// src/lib/growth/score.ts
//
// Turns a person's RECEIVED peer feedback into a transparent,
// per-competency KPI scorecard. Pure + deterministic so the same
// numbers render on the page and feed the AI report.
//
// Score model (0–100), per competency:
//   weight(note)   = 1 + (👍 votes on it)        // agreement amplifies
//   sW             = Σ weight over STRENGTH notes
//   gW             = Σ weight over GROWTH notes
//   score          = 50 + 50 · (sW − gW) / (sW + gW)
//   + progress nudge: acting on growth (done) lifts the score a little
//   → all strengths = 100, balanced = 50, all growth = 0, no data = null
// ============================================================

import type { NoteSafe, NoteTag } from '@/lib/types'

export const COMPETENCIES: NoteTag[] = [
  'Technical', 'Communication', 'Collaboration', 'Leadership', 'Delivery',
]

export const COMPETENCY_META: Record<NoteTag, { label: string; color: string; blurb: string }> = {
  Technical:     { label: 'Technical',     color: '#185FA5', blurb: 'Engineering craft & problem-solving' },
  Communication: { label: 'Communication', color: '#854F0B', blurb: 'Clarity, context-sharing & writing' },
  Collaboration: { label: 'Collaboration', color: '#0F6E56', blurb: 'Teamwork, support & reviews' },
  Leadership:    { label: 'Leadership',    color: '#534AB7', blurb: 'Ownership, direction & mentoring' },
  Delivery:      { label: 'Delivery',      color: '#993556', blurb: 'Shipping, reliability & follow-through' },
}

function votesOf(n: NoteSafe): number {
  return n.reactions?.find(r => r.emoji === '👍')?.count ?? 0
}

export interface CompetencyScore {
  key:       NoteTag
  score:     number | null   // 0–100, null when there's no relevant feedback
  strengths: number
  growth:    number
  mentions:  number          // total notes touching this competency
  votes:     number          // total agreement (👍) on those notes
}

export interface ScoredNote {
  id:         string
  content:    string
  tags:       NoteTag[]
  votes:      number
  done:       boolean
  primaryTag: NoteTag | null
}

export interface GrowthScores {
  overall:       number | null
  label:         string
  competencies:  CompetencyScore[]
  strengthNotes: ScoredNote[]
  growthNotes:   ScoredNote[]
  totalNotes:    number
  actioned:      number
  uncategorized: number   // strength/growth notes with no competency tag
}

// Smoothing prior: pulls small samples toward a neutral 50 so a single note
// never reads as a confident 0 or 100. Confidence grows with more feedback.
const PRIOR = 2

function scoreFrom(sW: number, gW: number, bonus = 0): number | null {
  if (sW + gW === 0) return null
  const base = 50 + 50 * (sW - gW) / (sW + gW + PRIOR)
  return Math.round(Math.min(100, Math.max(0, base + bonus)))
}

export function scoreLabel(score: number | null): string {
  if (score === null)  return 'No data yet'
  if (score >= 85)     return 'Exceptional'
  if (score >= 70)     return 'Strong'
  if (score >= 55)     return 'Solid'
  if (score >= 40)     return 'Developing'
  return 'Needs focus'
}

export function computeGrowthScores(notes: NoteSafe[]): GrowthScores {
  const competencies: CompetencyScore[] = COMPETENCIES.map(key => {
    const tagged = notes.filter(n => n.tags.includes(key))
    let sW = 0, gW = 0, strengths = 0, growth = 0, votes = 0

    for (const n of tagged) {
      const w = 1 + votesOf(n)
      votes += votesOf(n)
      if (n.note_type === 'strength')      { strengths++; sW += w }
      else if (n.note_type === 'growth')   { growth++;    gW += w }
    }

    const doneGrowth = tagged.filter(n => n.note_type === 'growth' && n.done).length
    const score = scoreFrom(sW, gW, Math.min(12, doneGrowth * 4))

    return { key, score, strengths, growth, mentions: tagged.length, votes }
  })

  // Overall reflects ALL strength/growth feedback — including notes that were
  // never tagged to a competency — so a genuine strength is never invisible.
  let allSW = 0, allGW = 0
  for (const n of notes) {
    const w = 1 + votesOf(n)
    if (n.note_type === 'strength')    allSW += w
    else if (n.note_type === 'growth') allGW += w
  }
  const overall = scoreFrom(allSW, allGW)

  const uncategorized = notes.filter(
    n => n.note_type !== 'general' && !n.tags.some(t => COMPETENCIES.includes(t)),
  ).length

  const toScored = (n: NoteSafe): ScoredNote => ({
    id:         n.id,
    content:    n.content,
    tags:       n.tags,
    votes:      votesOf(n),
    done:       n.done,
    primaryTag: n.tags.find(t => COMPETENCIES.includes(t)) ?? null,
  })

  const strengthNotes = notes.filter(n => n.note_type === 'strength').map(toScored).sort((a, b) => b.votes - a.votes)
  const growthNotes   = notes.filter(n => n.note_type === 'growth').map(toScored).sort((a, b) => b.votes - a.votes)

  return {
    overall,
    label:         scoreLabel(overall),
    competencies,
    strengthNotes,
    growthNotes,
    totalNotes:    notes.length,
    actioned:      notes.filter(n => n.done).length,
    uncategorized,
  }
}
