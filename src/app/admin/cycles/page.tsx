// src/app/admin/cycles/page.tsx
import { redirect }           from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { CycleManager }       from '@/components/admin/CycleManager'

export default async function AdminCyclesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(id, name)')
    .eq('profile_id', user.id)
    .eq('role', 'admin')

  if (!memberships?.length) redirect('/auth/login')

  const workspace = (memberships[0].workspaces as any)

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('workspace_id', workspace.id)

  const { data: cycles } = await supabase
    .from('feedback_cycles')
    .select('*, teams(name)')
    .in('team_id', (teams ?? []).map((t: any) => t.id))
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-[700px] px-4 py-6">
      <h1 className="text-[20px] font-medium mb-6">Feedback cycles</h1>
      <CycleManager
        teams={teams ?? []}
        cycles={cycles ?? []}
      />
    </div>
  )
}
