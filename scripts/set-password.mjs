// ============================================================
// TeamPulse — set (or create) a user's password directly
//
// Uses the Supabase service-role admin API, so it sends NO email
// and is not subject to the auth email rate limit. Run with bun
// (which auto-loads .env.local):
//
//   bun scripts/set-password.mjs
//   bun scripts/set-password.mjs someone@company.com 'their-password'
//
// If the user already exists, their password is updated and email
// marked confirmed. If not, the user is created (pre-confirmed).
// ============================================================

import { createClient } from '@supabase/supabase-js'

const EMAIL    = process.argv[2] || 'nirajan@jobins.jp'
const PASSWORD = process.argv[3] || 'TeamPulse!2026'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false } })

// Find the user by email (paginate through the admin user list).
async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < 200) break
  }
  return null
}

const existing = await findUserByEmail(EMAIL)

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) { console.error('Failed to update password:', error.message); process.exit(1) }
  console.log(`✓ Updated password for existing user ${EMAIL}`)
} else {
  const { error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) { console.error('Failed to create user:', error.message); process.exit(1) }
  console.log(`✓ Created new (pre-confirmed) user ${EMAIL}`)
}

console.log(`\n  Email:    ${EMAIL}`)
console.log(`  Password: ${PASSWORD}`)
console.log(`\nSign in at http://localhost:3000/auth/login`)
