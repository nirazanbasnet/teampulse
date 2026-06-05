// src/app/page.tsx
import Link                  from 'next/link'
import { redirect }          from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Button }            from '@/components/ui/button'
import { SignOutButton }     from '@/components/shared/SignOutButton'
import { TeamJoinWatcher }   from '@/components/shared/TeamJoinWatcher'

export default async function HomePage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Find first team the user belongs to
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('profile_id', user.id)
    .order('added_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membership?.team_id) {
    redirect(`/board/${membership.team_id}`)
  }

  // Not on a team yet — is this user a workspace admin? If so, surface
  // admin navigation instead of a dead end.
  const { data: adminMemberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('role', 'admin')
    .limit(1)

  const isAdmin = !!adminMemberships?.length

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Auto-redirects to the board the moment an admin/lead adds this user */}
      <TeamJoinWatcher userId={user.id} />
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          <i className="ti ti-users-group text-2xl text-primary" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-xl font-medium">You&apos;re not on any team yet</h1>

        {isAdmin ? (
          <>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              You&apos;re a workspace admin. Create a team and add yourself to it to start
              giving and receiving feedback.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/admin/teams">
                  <i className="ti ti-users-group text-base" aria-hidden="true" />
                  Manage teams
                </Link>
              </Button>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/admin/cycles">
                    <i className="ti ti-clock-hour-4 text-base" aria-hidden="true" />
                    Cycles
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/admin/moderation">
                    <i className="ti ti-shield text-base" aria-hidden="true" />
                    Moderation
                  </Link>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ask your workspace admin or a team lead to add you to a team.
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              You&apos;ll be taken to your board automatically once you&apos;re added.
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
