// src/app/admin/layout.tsx
// Wraps every /admin/* page with the Topbar (brand, team switcher, and the
// user menu that contains Sign out), so admins can log out from the
// Team management / Cycles / Moderation sections.
import { redirect }          from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Topbar }            from '@/components/shared/Topbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: myTeamRows } = await supabase
    .from('team_members').select('teams(id, name)').eq('profile_id', user.id)
  const userTeams = (myTeamRows ?? [])
    .map((r: any) => r.teams)
    .filter(Boolean) as { id: string; name: string }[]

  const { data: adminRow } = await supabase
    .from('workspace_members')
    .select('id').eq('profile_id', user.id).eq('role', 'admin').limit(1).maybeSingle()

  return (
    <>
      <Topbar profile={profile as any} isAdmin={!!adminRow} teams={userTeams} />
      {children}
    </>
  )
}
