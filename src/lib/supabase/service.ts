// ============================================================
// TeamPulse — Service Role Supabase Client
// src/lib/supabase/service.ts
//
// SECURITY: This client bypasses ALL Row Level Security.
//
// Use ONLY for:
//   - Reading notes_admin view (moderation with author_id)
//   - Writing cycle_summaries (AI generation server action)
//   - Writing audit_log entries
//   - Any operation that must run as a trusted server process
//
// NEVER:
//   - Import this in Client Components or browser code
//   - Expose SUPABASE_SERVICE_ROLE_KEY to the client
//   - Use this for regular data reads that have RLS policies
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Service client must only be used in server-side code.'
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
