// ============================================================
// TeamPulse — AI Growth Report
// src/server/actions/growth.ts
//
// On-demand: synthesizes a person's received peer feedback into a
// private growth report + concrete action plan. Server-only; runs
// on Cerebras (primary) with Groq fallback. Only ever generates the
// CALLER's own report (recipient_id = auth uid).
// ============================================================

'use server'

import { chatCompletion } from '@/lib/ai/client'
import { createServerClient } from '@/lib/supabase/server'
import { computeGrowthScores, COMPETENCY_META, COMPETENCIES } from '@/lib/growth/score'
import type { NoteSafe, NoteTag } from '@/lib/types'

const CEREBRAS_MODEL = 'llama-3.3-70b'
const GROQ_MODEL     = 'llama-3.3-70b-versatile'

export interface GrowthAICompetency {
  key:     string
  verdict: 'strength' | 'solid' | 'focus'
  insight: string
}

export interface GrowthAIAction {
  title:       string
  rationale:   string
  competency:  string
  firstStep:   string
}

export interface GrowthReportAI {
  headline:     string
  summary:      string
  competencies: GrowthAICompetency[]
  actionPlan:   GrowthAIAction[]
  managerNote:  string
}

export async function generateGrowthReport(
  { teamId, cycleId }: { teamId: string; cycleId: string | null },
): Promise<GrowthReportAI> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Read with the user's own session (same as the report page) — they can
  // always see feedback addressed to them. Using the service role here would
  // change row visibility on the auth.uid()-based notes_safe view.
  let query = supabase
    .from('notes_safe')
    .select('*')
    .eq('team_id', teamId)
    .eq('recipient_id', user.id)   // never anyone else's feedback
  if (cycleId) query = query.eq('cycle_id', cycleId)

  const { data: rows } = await query
  const received = (rows ?? []) as NoteSafe[]

  if (received.length < 2) {
    throw new Error('Not enough feedback yet — you need at least 2 notes to generate a report.')
  }

  const scores = computeGrowthScores(received)

  // ── Build a compact, faithful digest for the model ──
  const scoreLines = scores.competencies
    .filter(c => c.mentions > 0)
    .map(c => `- ${COMPETENCY_META[c.key].label}: ${c.score}/100 (${c.strengths} strengths, ${c.growth} growth)`)
    .join('\n')

  const quote = (tags: NoteTag[], content: string) => {
    const tag = tags.find(t => COMPETENCIES.includes(t))
    return `- [${tag ?? 'General'}] "${content.replace(/\s+/g, ' ').trim()}"`
  }
  const strengthsBlock = scores.strengthNotes.slice(0, 12).map(n => quote(n.tags, n.content)).join('\n') || '- (none)'
  const growthBlock    = scores.growthNotes.slice(0, 12).map(n => quote(n.tags, n.content)).join('\n') || '- (none)'

  const system = `You are an experienced engineering manager and career coach writing a PRIVATE growth report for a software engineer, based only on anonymous peer feedback they received this cycle. The report is shown only to that engineer (who may choose to share it with their manager).

Return STRICT JSON, no markdown, exactly this shape:
{
  "headline": "<=8 word punchy headline of the cycle",
  "summary": "2-3 sentence honest overview in second person",
  "competencies": [{"key":"Technical|Communication|Collaboration|Leadership|Delivery","verdict":"strength|solid|focus","insight":"<=22 words, specific, second person"}],
  "actionPlan": [{"title":"<=8 word action","rationale":"why, tied to the feedback, <=20 words","competency":"<one competency>","firstStep":"a concrete first step they can do this week"}],
  "managerNote": "a short paragraph the engineer could share with their manager: balanced, evidence-based, professional"
}

Rules:
- Write in second person ("You…", "Your peers…").
- Be specific and honest — name real strengths AND real growth areas. Do not be vague or only positive.
- Only use what the feedback supports; never invent specifics.
- competencies: include only those that actually have feedback.
- actionPlan: 3 to 4 items, prioritise the lowest-scoring / most-mentioned growth areas, each with a concrete first step.
- Do not reveal or guess who wrote any note. Output only JSON.`

  const userMsg = `Cycle competency scores (0-100, higher = stronger):
${scoreLines}

Strengths peers highlighted (verbatim):
${strengthsBlock}

Growth areas peers raised (verbatim):
${growthBlock}

Notes received: ${scores.totalNotes}. Items the person has already actioned: ${scores.actioned}.

Write the growth report JSON now.`

  const { text } = await chatCompletion({
    cerebrasModel: CEREBRAS_MODEL,
    groqModel:     GROQ_MODEL,
    maxTokens:     900,
    temperature:   0.5,
    json:          true,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: userMsg },
    ],
  })

  let parsed: Partial<GrowthReportAI>
  try {
    parsed = JSON.parse(text) as Partial<GrowthReportAI>
  } catch {
    throw new Error('The AI returned an unexpected response. Please try again.')
  }

  // Defensive normalisation so the UI never crashes on a malformed field.
  return {
    headline:     typeof parsed.headline === 'string' ? parsed.headline : 'Your cycle in review',
    summary:      typeof parsed.summary === 'string'  ? parsed.summary  : '',
    competencies: Array.isArray(parsed.competencies)
      ? parsed.competencies.filter(c => c && typeof c.insight === 'string').slice(0, 5)
      : [],
    actionPlan:   Array.isArray(parsed.actionPlan)
      ? parsed.actionPlan.filter(a => a && typeof a.title === 'string').slice(0, 4)
      : [],
    managerNote:  typeof parsed.managerNote === 'string' ? parsed.managerNote : '',
  }
}
