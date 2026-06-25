// ============================================================
// TeamPulse — Email templates
// src/lib/email/templates.ts
//
// ANONYMITY: feedback is anonymous. These templates NEVER reference
// the author in any form — only the note type, area tags, content,
// and a link back to the recipient's board (which they can already
// read). User-supplied text is HTML-escaped before interpolation.
// ============================================================

import type { NoteType, NoteTag } from '@/lib/types'

const BRAND = '#1D9E75'
const INK = '#1a1a1a'
const MUTED = '#6b6b67'
const BORDER = '#e6e6e3'

const TYPE_LABEL: Record<NoteType, string> = {
  strength: 'Strength',
  growth:   'Growth',
  general:  'General',
}

// Subject line stays neutral so the inbox preview reveals nothing
// sensitive — the type lives inside the email, not the subject.
const TYPE_SUBJECT: Record<NoteType, string> = {
  strength: 'recognised a strength',
  growth:   'shared growth feedback',
  general:  'left you feedback',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface FeedbackEmailInput {
  recipientName: string
  noteType:      NoteType
  tags:          NoteTag[]
  content:       string
  teamName:      string
  boardUrl:      string
}

export interface RenderedEmail {
  subject: string
  html:    string
  text:    string
}

export function feedbackReceivedTemplate(input: FeedbackEmailInput): RenderedEmail {
  const { recipientName, noteType, tags, content, teamName, boardUrl } = input
  const typeLabel = TYPE_LABEL[noteType]
  const firstName = recipientName.trim().split(/\s+/)[0] || 'there'

  const subject = `Someone ${TYPE_SUBJECT[noteType]} on ${teamName}`

  const tagPills = tags
    .map(
      t =>
        `<span style="display:inline-block;font-size:12px;color:${BRAND};background:#E1F5EE;border:1px solid #BCE7D8;border-radius:20px;padding:3px 10px;margin:0 6px 6px 0;">${escapeHtml(
          t,
        )}</span>`,
    )
    .join('')

  const areaRow = tags.length
    ? `<tr><td style="padding:0 0 14px 0;">${tagPills}</td></tr>`
    : ''

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">You have new ${escapeHtml(typeLabel)} feedback on ${escapeHtml(teamName)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f3;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
        <tr><td style="padding:22px 28px 0 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:14px;font-weight:600;color:${INK};">
              <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${BRAND};margin-right:7px;"></span>TeamPulse
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:18px 28px 0 28px;">
          <p style="margin:0 0 6px 0;font-size:13px;color:${MUTED};">Hi ${escapeHtml(firstName)},</p>
          <h1 style="margin:0 0 4px 0;font-size:19px;line-height:1.35;color:${INK};font-weight:600;">
            You received new ${escapeHtml(typeLabel)} feedback
          </h1>
          <p style="margin:0 0 18px 0;font-size:13px;color:${MUTED};">
            A teammate on <strong style="color:${INK};font-weight:600;">${escapeHtml(teamName)}</strong> left you anonymous feedback.
          </p>
        </td></tr>
        <tr><td style="padding:0 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${areaRow}
            <tr><td style="border-left:3px solid ${BRAND};background:#fafbfa;border-radius:0 8px 8px 0;padding:14px 16px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:${INK};white-space:pre-wrap;">${escapeHtml(content)}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 28px 8px 28px;">
          <a href="${escapeHtml(boardUrl)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:9px;">
            View on your board
          </a>
        </td></tr>
        <tr><td style="padding:14px 28px 24px 28px;border-top:1px solid ${BORDER};margin-top:12px;">
          <p style="margin:14px 0 0 0;font-size:11px;line-height:1.6;color:${MUTED};">
            Feedback on TeamPulse is anonymous — we never reveal who sent it.<br/>
            Don't want these emails? Turn them off from the account menu in the app.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = [
    `Hi ${firstName},`,
    '',
    `You received new ${typeLabel} feedback on ${teamName}.`,
    tags.length ? `Area${tags.length > 1 ? 's' : ''}: ${tags.join(', ')}` : '',
    '',
    content,
    '',
    `View on your board: ${boardUrl}`,
    '',
    'Feedback on TeamPulse is anonymous — we never reveal who sent it.',
    "Don't want these emails? Turn them off from the account menu in the app.",
  ]
    .filter(line => line !== '')
    .join('\n')

  return { subject, html, text }
}
