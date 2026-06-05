// ============================================================
// TeamPulse — Browser Supabase Client
// src/lib/supabase/browser.ts
//
// Use in Client Components ('use client').
// Singleton pattern — one client per browser tab.
// ============================================================

import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let client: ReturnType<typeof _createBrowserClient<Database>> | null = null

export function createBrowserClient() {
  if (client) return client

  client = _createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return client
}
