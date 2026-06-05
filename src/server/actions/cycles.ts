// src/server/actions/cycles.ts
'use server'

import { revalidatePath }               from 'next/cache'
import { createServerClient }           from '@/lib/supabase/server'
import { closeCycleAndGenerateSummaries } from './summaries'

export async function openCycle({ teamId, name }: { teamId: string; name: string }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('feedback_cycles').insert({
    team_id:    teamId,
    name:       name.trim(),
    created_by: user.id,
    status:     'active',
    starts_at:  new Date().toISOString(),
  })

  if (error) throw new Error(`Failed to open cycle: ${error.message}`)
  revalidatePath('/admin/cycles')
  revalidatePath(`/board/${teamId}`)
  return { success: true }
}

export async function closeCycleAction(cycleId: string) {
  // Delegates to summaries action which handles close + AI generation
  const result = await closeCycleAndGenerateSummaries(cycleId)
  revalidatePath('/admin/cycles')
  revalidatePath('/analytics')
  return result
}
