// ============================================================
// TeamPulse — Feedback notification orchestration
// src/lib/email/notify.ts
//
// Resolves the recipient + team, honours the recipient's email
// preference, renders the template, and sends. Server-only.
//
// Best-effort by contract: this NEVER throws. A failed lookup or a
// down email provider must not affect the feedback that triggered it,
// so every failure is swallowed and logged.
// ============================================================

import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail, isEmailConfigured } from './client'
import { feedbackReceivedTemplate } from './templates'
import type { NoteType, NoteTag } from '@/lib/types'

// Server-side base URL for the board link in the email. There's no
// request origin available inside a server action, so this comes from
// env (falls back to localhost for dev).
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

export interface FeedbackNotificationInput {
  recipientId: string
  teamId:      string
  noteType:    NoteType
  tags:        NoteTag[]
  content:     string
}

export async function notifyFeedbackReceived(input: FeedbackNotificationInput): Promise<void> {
  // Skip the DB round-trips entirely if there's no transport configured.
  if (!isEmailConfigured()) return

  try {
    // Service role: we need the recipient's email + preference, which the
    // anonymous author cannot (and should not) read via RLS.
    const service = createServiceClient()

    const [{ data: recipient }, { data: team }] = await Promise.all([
      service
        .from('profiles')
        .select('email, full_name, email_notifications')
        .eq('id', input.recipientId)
        .single(),
      service
        .from('teams')
        .select('name')
        .eq('id', input.teamId)
        .single(),
    ])

    if (!recipient?.email) return
    if (recipient.email_notifications === false) return // opted out

    const { subject, html, text } = feedbackReceivedTemplate({
      recipientName: recipient.full_name ?? 'there',
      noteType:      input.noteType,
      tags:          input.tags,
      content:       input.content,
      teamName:      team?.name ?? 'your team',
      boardUrl:      `${SITE_URL}/board/${input.teamId}`,
    })

    await sendEmail({ to: recipient.email, subject, html, text })
  } catch (err) {
    console.error('[email] notifyFeedbackReceived failed:', err)
  }
}
