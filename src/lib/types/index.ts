// ============================================================
// TeamPulse — Domain Types
// src/lib/types/index.ts
//
// These types mirror the Supabase schema. Generate the full
// Supabase types with: npx supabase gen types typescript
// This file contains the hand-curated domain layer on top.
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type NoteType    = 'general' | 'strength' | 'growth'
export type NoteTag     = 'Communication' | 'Technical' | 'Collaboration' | 'Leadership' | 'Delivery'
export type UserRole    = 'admin' | 'member'
export type CycleStatus = 'active' | 'closed' | 'archived'
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'removed'
export type NoteEmoji   = '👍' | '💡' | '❤️'

// ── Core entities ─────────────────────────────────────────────

export interface Profile {
  id:         string
  email:      string
  full_name:  string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id:         string
  name:       string
  slug:       string
  owner_id:   string
  settings:   WorkspaceSettings
  created_at: string
  updated_at: string
}

export interface WorkspaceSettings {
  grace_period_minutes:    number   // default 30
  note_char_limit:         number   // default 400
  reactions_enabled:       boolean  // default true
  min_team_size_for_anon:  number   // default 3
}

export interface WorkspaceMember {
  id:           string
  workspace_id: string
  profile_id:   string
  role:         UserRole
  invited_by:   string | null
  joined_at:    string
  // Joined
  profile?:     Profile
}

export interface Team {
  id:           string
  workspace_id: string
  name:         string
  description:  string | null
  created_by:   string
  created_at:   string
  updated_at:   string
  // Joined
  members?:     TeamMember[]
}

export interface TeamMember {
  id:         string
  team_id:    string
  profile_id: string
  added_by:   string | null
  added_at:   string
  // Joined
  profile?:   Profile
}

export interface FeedbackCycle {
  id:         string
  team_id:    string
  name:       string
  status:     CycleStatus
  starts_at:  string
  ends_at:    string | null
  closed_at:  string | null
  created_by: string
  created_at: string
  updated_at: string
}

// ── Notes ─────────────────────────────────────────────────────
//
// NoteRow is what the DB stores (author_id present).
// NoteSafe is what the notes_safe VIEW returns to clients
//   (author_id absent; is_mine/can_mark_done/can_edit present).
// NoteAdmin is the full row used in server-side moderation.

export interface NoteRow {
  id:                  string
  team_id:             string
  cycle_id:            string | null
  recipient_id:        string
  author_id:           string      // NEVER send to client
  note_type:           NoteType
  content:             string
  tags:                NoteTag[]
  position:            number
  done:                boolean
  done_at:             string | null
  created_at:          string
  created_at_display:  string
  updated_at:          string
}

export interface NoteSafe {
  id:            string
  team_id:       string
  cycle_id:      string | null
  recipient_id:  string
  // author_id intentionally absent
  note_type:     NoteType
  content:       string
  tags:          NoteTag[]
  position:      number
  done:          boolean
  done_at:       string | null
  created_at:    string          // hour-rounded
  updated_at:    string
  // Computed booleans from the view
  is_mine:       boolean         // current user is the author
  can_mark_done: boolean         // current user is the recipient
  can_edit:      boolean         // author + within grace period
  // Client-joined
  reactions?:    ReactionCount[]
}

export interface NoteAdmin extends NoteRow {
  author_name:    string
  author_email:   string
  recipient_name: string
}

// ── Note mutations ────────────────────────────────────────────

export interface CreateNoteInput {
  team_id:      string
  cycle_id?:    string
  recipient_id: string
  note_type:    NoteType
  content:      string
  tags:         NoteTag[]
}

export interface UpdateNotePositionInput {
  id:       string
  position: number
}

// ── Reactions ─────────────────────────────────────────────────

export interface ReactionCount {
  note_id:       string
  emoji:         NoteEmoji
  count:         number
  reacted_by_me: boolean
}

// ── Content reports ───────────────────────────────────────────

export interface ContentReport {
  id:          string
  note_id:     string
  reporter_id: string
  reason:      string
  status:      ReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_note:  string | null
  created_at:  string
}

// ── Cycle summaries ───────────────────────────────────────────

export interface CycleSummary {
  id:           string
  cycle_id:     string
  profile_id:   string
  summary_text: string
  model_used:   string
  generated_at: string
}

// ── Invite ────────────────────────────────────────────────────

export interface Invite {
  id:           string
  workspace_id: string
  team_id:      string | null
  email:        string
  role:         UserRole
  token:        string
  invited_by:   string
  accepted_at:  string | null
  expires_at:   string
  created_at:   string
}

// ── Board view model ──────────────────────────────────────────
// Assembled client-side from notes + team members

export interface BoardColumn {
  member:     TeamMember & { profile: Profile }
  notes:      NoteSafe[]
  isMyColumn: boolean
}

export interface BoardState {
  team:    Team
  cycle:   FeedbackCycle | null
  columns: BoardColumn[]
}

// ── Analytics ─────────────────────────────────────────────────

export interface TeamAnalytics {
  cycle_id:         string
  total_notes:      number
  done_notes:       number
  completion_rate:  number
  participation:    number   // 0-1 fraction of members who gave notes
  tag_distribution: Record<NoteTag, number>
  type_distribution: Record<NoteType, number>
  member_stats:     MemberStat[]
}

export interface MemberStat {
  profile:          Profile
  notes_received:   number
  notes_given:      number
  completion_rate:  number
  tag_breakdown:    Record<NoteTag, number>
}

// ── Auth context ──────────────────────────────────────────────

export interface AuthUser {
  id:           string
  email:        string
  profile:      Profile
  workspaces:   WorkspaceMember[]
}
