// src/app/admin/moderation/page.tsx
import { redirect }           from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ModerationQueue }    from '@/components/admin/ModerationQueue'

export default async function ModerationPage() {
  const supabase        = createServerClient()
  const serviceClient   = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify admin
  const { data: adminCheck } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (!adminCheck) redirect('/auth/login')

  // Load pending reports with full note data (service role to see author)
  const { data: reports } = await serviceClient
    .from('content_reports')
    .select(`
      *,
      profiles!content_reports_reporter_id_fkey(full_name, email),
      notes_admin!inner(id, content, note_type, tags, author_name, author_email, recipient_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div className="mx-auto max-w-[760px] px-4 py-6">
      <div className="flex items-center gap-[10px] mb-6">
        <h1 className="text-[20px] font-medium m-0">Content moderation</h1>
        {(reports?.length ?? 0) > 0 && (
          <span className="text-[12px] px-2 py-0.5 rounded-[20px] bg-[#FAECE7] text-[#993C1D] font-mono">
            {reports?.length} pending
          </span>
        )}
      </div>
      <ModerationQueue reports={reports ?? []} />
    </div>
  )
}

export const revalidate = 0
