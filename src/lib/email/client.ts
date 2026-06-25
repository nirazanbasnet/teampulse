// ============================================================
// TeamPulse — Transactional email transport (Resend)
// src/lib/email/client.ts
//
// Thin wrapper over the Resend REST API (no SDK dependency — mirrors
// how the AI client talks to providers over HTTP). Server-only:
// RESEND_API_KEY must never reach the browser.
//
// Fails SOFT: if no key is configured, or Resend errors, we log and
// return { ok: false } rather than throwing — sending an email must
// never block or break the action that triggered it.
// ============================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY
// Resend lets you send from onboarding@resend.dev without a verified
// domain, which is handy for local/testing. Override EMAIL_FROM with a
// verified sender (e.g. "TeamPulse <feedback@yourdomain.com>") in prod.
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'TeamPulse <onboarding@resend.dev>'

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY
}

export interface SendEmailInput {
  to:      string
  subject: string
  html:    string
  text:    string
  /** Optional plain-text reply target; defaults to the From address. */
  replyTo?: string
}

export interface SendEmailResult {
  ok:     boolean
  id?:    string
  error?: string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', input.to)
    return { ok: false, error: 'not_configured' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     EMAIL_FROM,
        to:       [input.to],
        subject:  input.subject,
        html:     input.html,
        text:     input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[email] Resend responded', res.status, body)
      return { ok: false, error: `resend_${res.status}` }
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, id: data.id }
  } catch (err) {
    console.error('[email] send failed:', err)
    return { ok: false, error: 'exception' }
  }
}
