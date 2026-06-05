// ============================================================
// TeamPulse — Server Supabase Client
// src/lib/supabase/server.ts
//
// Use in Server Components, Server Actions, and Route Handlers.
// Reads/writes session cookies via Next.js cookies() API.
// Never use this in Client Components.
// ============================================================

import { createServerClient as _createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export function createServerClient() {
  const cookieStore = cookies()

  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // In Server Components the cookie store is read-only; the
          // middleware refreshes the session, so swallow write errors here.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // called from a Server Component — safe to ignore
          }
        },
      },
    },
  )
}
