// ============================================================
// TeamPulse — AI content moderation (Cerebras → Groq)
// src/lib/ai/moderate.ts
//
// Screens peer feedback BEFORE it is saved. Server-only.
//   - 'block' : clearly inappropriate (sexual, hate/slurs, threats,
//               harassment, pure spam) — the note is rejected.
//   - 'flag'  : borderline / rude / off-topic (song lyrics, life
//               rants, mild insults) — saved, but auto-flagged into
//               the admin moderation queue for review.
//   - 'allow' : constructive or neutral work feedback (incl. critical).
//
// Runs on Cerebras (primary) with automatic Groq fallback.
// Fails OPEN: if every provider errors, the note is allowed (so an
// AI outage never blocks legitimate feedback).
// ============================================================

import { chatCompletion } from './client'

export type ModerationDecision = 'allow' | 'flag' | 'block'

export interface ModerationResult {
  decision: ModerationDecision
  category: string   // sexual | hate | harassment | threat | spam | off_topic | ok
  reason:   string   // short, user-facing explanation
}

const CEREBRAS_MODEL = 'llama3.1-8b'
const GROQ_MODEL     = 'llama-3.1-8b-instant'

const SYSTEM_PROMPT = `You are a content moderator for a workplace ANONYMOUS peer-feedback tool.
Members leave short feedback notes on each other's work and behaviour. Decide if a note is acceptable.

Return STRICT JSON: {"decision":"allow|flag|block","category":"sexual|hate|harassment|threat|spam|insult|off_topic|ok","reason":"<short reason>"}

block  = sexual/explicit content, slurs or hate speech, threats or violence, obvious spam/advertising, OR any direct personal insult / name-calling aimed at the person (e.g. "you're an idiot", "you're stupid/useless/dumb/lazy", "you suck").
flag   = clearly off-topic (song lyrics, personal life rants, jokes, random unrelated text) or vague non-constructive negativity.
allow  = genuine work feedback, including blunt or critical-but-CONSTRUCTIVE feedback about the person's work or behaviour, and neutral notes.

Key rule: critique of the WORK is allowed ("your code is buggy, add tests"); attacks on the PERSON are blocked ("you're an idiot"). Be lenient with honest critical feedback — that is the point of the tool. Keep "reason" under 12 words, friendly.`

export async function moderateFeedback(content: string): Promise<ModerationResult> {
  try {
    const { text: raw } = await chatCompletion({
      cerebrasModel: CEREBRAS_MODEL,
      groqModel:     GROQ_MODEL,
      maxTokens:     120,
      temperature:   0,
      json:          true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Feedback note:\n"""${content}"""` },
      ],
    })

    if (!raw) return { decision: 'allow', category: 'ok', reason: '' }

    const parsed = JSON.parse(raw) as Partial<ModerationResult>
    const decision: ModerationDecision =
      parsed.decision === 'block' || parsed.decision === 'flag' ? parsed.decision : 'allow'

    return {
      decision,
      category: parsed.category ?? 'ok',
      reason:   (parsed.reason ?? '').toString().slice(0, 160),
    }
  } catch (err) {
    // Fail open — never block legitimate feedback because the AI is down.
    console.error('[moderation] AI error, allowing note:', err)
    return { decision: 'allow', category: 'ok', reason: '' }
  }
}
