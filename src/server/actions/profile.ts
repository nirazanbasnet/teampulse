// ============================================================
// TeamPulse — Profile Server Actions
// src/server/actions/profile.ts
// ============================================================

'use server'

import { createServerClient } from '@/lib/supabase/server'

// ── Toggle "you received feedback" email notifications ────────
// The profiles RLS policy ("owner can update") restricts this to the
// caller's own row, so the user client is sufficient.

export async function updateEmailNotifications(enabled: boolean) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ email_notifications: enabled })
    .eq('id', user.id)

  if (error) throw new Error(`Failed to update email preference: ${error.message}`)

  return { success: true }
}
