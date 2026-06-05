// ============================================================
// TeamPulse — AI Cycle Summary Server Action
// src/server/actions/summaries.ts
//
// Triggered when an admin closes a feedback cycle.
// Generates a private per-member plain-language summary
// using Claude. Uses service role to access full note data.
//
// The summary is:
//   - Generated server-side only (API key never exposed)
//   - Stored in cycle_summaries (private per member RLS)
//   - Never includes inferred author identity
// ============================================================

'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { NoteTag, NoteType } from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ── Close cycle and generate all member summaries ────────────

export async function closeCycleAndGenerateSummaries(cycleId: string) {
  const supabase      = createServerClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Load cycle with team info
  const { data: cycle } = await serviceClient
    .from('feedback_cycles')
    .select('*, teams(workspace_id, name)')
    .eq('id', cycleId)
    .single()

  if (!cycle) throw new Error('Cycle not found.')
  if (cycle.status !== 'active') throw new Error('Cycle is not active.')

  // Verify admin
  const workspaceId = (cycle.teams as any).workspace_id
  const { data: adminCheck } = await serviceClient
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', user.id)
    .eq('role', 'admin')
    .single()

  if (!adminCheck) throw new Error('Admin access required.')

  // Load all notes for this cycle with full data (service role)
  const { data: allNotes } = await serviceClient
    .from('notes_admin')
    .select('*')
    .eq('cycle_id', cycleId)

  if (!allNotes || allNotes.length === 0) {
    // Close cycle even if no notes
    await serviceClient
      .from('feedback_cycles')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', cycleId)
    return { success: true, summaries_generated: 0 }
  }

  // Get unique recipients
  const recipientIds = [...new Set(allNotes.map(n => n.recipient_id))]

  let summariesGenerated = 0

  for (const recipientId of recipientIds) {
    const recipientNotes = allNotes.filter(n => n.recipient_id === recipientId)

    // Need minimum threshold for meaningful summary
    if (recipientNotes.length < 2) continue

    try {
      const summaryText = await generateMemberSummary({
        recipientName: recipientNotes[0].recipient_name,
        cycleName:     cycle.name,
        notes:         recipientNotes.map(n => ({
          type: n.note_type as NoteType,
          tags: n.tags as NoteTag[],
          content: n.content,
          done: n.done,
        })),
      })

      // Store summary (private to recipient via RLS)
      await serviceClient
        .from('cycle_summaries')
        .upsert({
          cycle_id:     cycleId,
          profile_id:   recipientId,
          summary_text: summaryText,
          model_used:   'claude-sonnet-4-20250514',
        }, { onConflict: 'cycle_id,profile_id' })

      summariesGenerated++
    } catch (err) {
      console.error(`Failed to generate summary for ${recipientId}:`, err)
      // Continue generating for other members
    }
  }

  // Close the cycle
  await serviceClient
    .from('feedback_cycles')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', cycleId)

  // Audit log
  await serviceClient.from('audit_log').insert({
    workspace_id: workspaceId,
    actor_id:     user.id,
    action:       'cycle_closed',
    target_table: 'feedback_cycles',
    target_id:    cycleId,
    metadata:     { summaries_generated: summariesGenerated },
  })

  return { success: true, summaries_generated: summariesGenerated }
}

// ── Generate one member's summary via Claude ─────────────────

interface MemberSummaryInput {
  recipientName: string
  cycleName:     string
  notes: {
    type:    NoteType
    tags:    NoteTag[]
    content: string
    done:    boolean
  }[]
}

async function generateMemberSummary(input: MemberSummaryInput): Promise<string> {
  const notesSummary = input.notes
    .map((n, i) => {
      const tags = n.tags.length ? `[${n.tags.join(', ')}]` : '[untagged]'
      const type = n.type.charAt(0).toUpperCase() + n.type.slice(1)
      const status = n.done ? '(actioned)' : '(pending)'
      return `${i + 1}. ${type} note ${tags} ${status}: "${n.content}"`
    })
    .join('\n')

  const strengthCount  = input.notes.filter(n => n.type === 'strength').length
  const growthCount    = input.notes.filter(n => n.type === 'growth').length
  const completionRate = input.notes.length
    ? Math.round(input.notes.filter(n => n.done).length / input.notes.length * 100)
    : 0

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: `You are writing private, personal career-growth summaries for team members.
The summaries are shown ONLY to the individual themselves — not to managers or peers.

Rules:
- Write in second person ("Your peers notice...", "You tend to...")
- Be specific, constructive, and honest — not vague or excessively positive
- Identify 1-2 genuine strengths and 1-2 genuine growth areas based on the actual notes
- Keep it to 3 sentences maximum
- Never mention how many people gave feedback or attempt to attribute specific notes
- Do not include the person's name
- Do not use markdown formatting`,

    messages: [
      {
        role: 'user',
        content: `Write a 3-sentence private feedback summary for this team member.

Cycle: ${input.cycleName}
Total notes: ${input.notes.length} (${strengthCount} strengths, ${growthCount} growth areas)
Completion rate: ${completionRate}% of notes actioned

Notes received:
${notesSummary}

Write the summary now.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected Claude response type')

  return content.text.trim()
}
