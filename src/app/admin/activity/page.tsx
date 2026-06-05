// src/app/admin/activity/page.tsx
// Feedback activity log — visible to workspace admins (all teams) and team
// leads (their teams). Shows the ACTUAL author → recipient, content, and
// date for every note. Uses the service role to resolve author identity.
import { redirect }            from 'next/navigation'
import { createServerClient }  from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Avatar }              from '@/components/shared/Avatar'

export const revalidate = 0

const TYPE_COLORS: Record<string, string> = {
  general: '#EAB308', strength: '#1D9E75', growth: '#378ADD',
}

export default async function ActivityPage() {
  const supabase = createServerClient()
  const service  = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Workspace (prefer admin membership) + admin flag.
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name)')
    .eq('profile_id', user.id)
  const adminMembership = (memberships ?? []).find((m: any) => m.role === 'admin')
  const anyMembership   = adminMembership ?? (memberships ?? [])[0]
  if (!anyMembership) redirect('/')
  const workspace = (anyMembership as any).workspaces
  const isAdmin   = !!adminMembership

  // Teams the user leads.
  const { data: ledRows } = await supabase
    .from('team_members').select('team_id').eq('profile_id', user.id).eq('role', 'lead')
  const ledTeamIds = new Set((ledRows ?? []).map((r: any) => r.team_id))

  // Teams in the workspace; visible set depends on role.
  const { data: teams } = await supabase
    .from('teams').select('id, name').eq('workspace_id', workspace.id)
  const teamName = new Map((teams ?? []).map((t: any) => [t.id, t.name]))
  const visibleTeamIds = (teams ?? [])
    .map((t: any) => t.id)
    .filter((id: string) => isAdmin || ledTeamIds.has(id))

  if (!isAdmin && visibleTeamIds.length === 0) redirect('/')

  // All notes for those teams, newest first (service role → includes author).
  const { data: notes } = visibleTeamIds.length
    ? await service
        .from('notes_admin')
        .select('id, team_id, content, note_type, tags, created_at, done, author_name, author_email, recipient_name')
        .in('team_id', visibleTeamIds)
        .order('created_at', { ascending: false })
        .limit(300)
    : { data: [] }

  // Group by calendar day.
  const groups = new Map<string, any[]>()
  for (const n of notes ?? []) {
    const day = new Date(n.created_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    if (!groups.has(day)) groups.set(day, [])
    groups.get(day)!.push(n)
  }

  return (
    <div className="mx-auto max-w-[820px] px-4 py-6">
      <div className="flex items-center gap-[10px] mb-1">
        <h1 className="text-[20px] font-medium m-0">Activity log</h1>
        <span className="text-[12px] px-2 py-0.5 rounded-[20px] bg-muted border border-border text-muted-foreground">
          {workspace.name}
        </span>
        {!isAdmin && (
          <span className="text-[11px] px-2 py-0.5 rounded-[20px] bg-[#FAEEDA] text-[#854F0B] border border-[#F5E0B8]">
            Team lead
          </span>
        )}
      </div>
      <p className="text-[12px] text-muted-foreground mb-5">
        Who sent what, to whom, and when. Author identity is visible here to {isAdmin ? 'workspace admins' : 'team leads'} — handle responsibly.
      </p>

      {(notes ?? []).length === 0 ? (
        <div className="border border-dashed border-border rounded-[12px] p-12 text-center text-muted-foreground/70 text-sm">
          <i className="ti ti-history block text-[32px] mb-[10px] opacity-40" aria-hidden="true" />
          No feedback activity yet.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {[...groups.entries()].map(([day, items]) => (
            <div key={day}>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                {day}
              </div>
              <div className="flex flex-col gap-2">
                {items.map((n: any) => (
                  <div key={n.id} className="border border-border rounded-[10px] bg-background p-[12px]">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Avatar name={n.author_name} size={22} />
                      <span className="text-[12px] font-medium text-foreground">{n.author_name}</span>
                      <span className="text-[11px] text-muted-foreground">{n.author_email}</span>
                      <i className="ti ti-arrow-right text-[12px] text-muted-foreground/70" aria-hidden="true" />
                      <span className="text-[12px] font-medium text-foreground">{n.recipient_name}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground font-mono">
                        {new Date(n.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className="bg-muted rounded-md px-3 py-2 text-[13px] text-foreground leading-[1.55]"
                      style={{ borderLeft: `3px solid ${TYPE_COLORS[n.note_type] ?? '#999'}` }}
                    >
                      {n.content}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className="text-[10px] px-[7px] py-px rounded-[20px] font-mono"
                        style={{ background: `${TYPE_COLORS[n.note_type] ?? '#999'}22`, color: TYPE_COLORS[n.note_type] ?? '#666' }}
                      >
                        {n.note_type}
                      </span>
                      {(n.tags ?? []).map((tag: string) => (
                        <span key={tag} className="text-[10px] px-[7px] py-px rounded-[20px] bg-muted text-muted-foreground font-mono">{tag}</span>
                      ))}
                      {n.done && (
                        <span className="text-[10px] px-[7px] py-px rounded-[20px] bg-[#E1F5EE] text-[#0F6E56] font-mono inline-flex items-center gap-1">
                          <i className="ti ti-check text-[10px]" aria-hidden="true" /> actioned
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground/70 font-mono">{teamName.get(n.team_id) ?? ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
