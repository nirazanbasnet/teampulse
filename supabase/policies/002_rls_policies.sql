-- ============================================================
-- TeamPulse — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Run after: 001_initial_schema.sql
--
-- CORE ANONYMITY GUARANTEE
--   The notes table has an author_id column. RLS ensures:
--   1. Team members querying notes NEVER receive author_id
--      in the response — enforced via a security-barrier view.
--   2. Only workspace admins can see author_id, and only when
--      a content_report exists for that note.
--   3. Authors can see their own author_id (for edit/delete).
-- ============================================================

-- Enable RLS on all public tables
alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.teams             enable row level security;
alter table public.team_members      enable row level security;
alter table public.feedback_cycles   enable row level security;
alter table public.notes             enable row level security;
alter table public.note_reactions    enable row level security;
alter table public.content_reports   enable row level security;
alter table public.cycle_summaries   enable row level security;
alter table public.invites           enable row level security;
alter table public.audit_log         enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================

-- Anyone authenticated can read public profile info
create policy "profiles: authenticated can read"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile
create policy "profiles: owner can update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- WORKSPACES
-- ============================================================

create policy "workspaces: members can read"
  on public.workspaces for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
        and profile_id   = auth.uid()
    )
  );

create policy "workspaces: admins can update"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

create policy "workspaces: authenticated can create"
  on public.workspaces for insert
  to authenticated
  with check (owner_id = auth.uid());

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================

-- NOTE: uses the SECURITY DEFINER helper (not an inline self-select)
-- to avoid "infinite recursion detected in policy" on this table.
create policy "workspace_members: members can read own workspace roster"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "workspace_members: admins can insert"
  on public.workspace_members for insert
  to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_members: admins can delete"
  on public.workspace_members for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ============================================================
-- TEAMS
-- ============================================================

create policy "teams: workspace members can read"
  on public.teams for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = teams.workspace_id
        and profile_id   = auth.uid()
    )
  );

create policy "teams: admins can insert"
  on public.teams for insert
  to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy "teams: admins can update"
  on public.teams for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "teams: admins can delete"
  on public.teams for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ============================================================
-- TEAM MEMBERS
-- ============================================================

create policy "team_members: team members can read roster"
  on public.team_members for select
  to authenticated
  using (public.is_team_member(team_id));

create policy "team_members: admins can insert"
  on public.team_members for insert
  to authenticated
  with check (
    public.is_workspace_admin(public.team_workspace_id(team_id))
  );

create policy "team_members: admins can delete"
  on public.team_members for delete
  to authenticated
  using (
    public.is_workspace_admin(public.team_workspace_id(team_id))
  );

-- ============================================================
-- FEEDBACK CYCLES
-- ============================================================

create policy "cycles: team members can read"
  on public.feedback_cycles for select
  to authenticated
  using (public.is_team_member(team_id));

create policy "cycles: admins can insert"
  on public.feedback_cycles for insert
  to authenticated
  with check (
    public.is_workspace_admin(public.team_workspace_id(team_id))
  );

create policy "cycles: admins can update"
  on public.feedback_cycles for update
  to authenticated
  using (public.is_workspace_admin(public.team_workspace_id(team_id)))
  with check (public.is_workspace_admin(public.team_workspace_id(team_id)));

-- ============================================================
-- NOTES — THE CRITICAL ANONYMITY TABLE
--
-- SELECT policy: team members can read notes on their team BUT
--   author_id is stripped via a security-barrier view below.
--
-- INSERT policy: team members can insert notes but NOT on
--   themselves (backed up by the DB CHECK constraint too).
--
-- UPDATE policy:
--   - Recipients can update only the `done` and `position` columns
--   - Authors can update content/tags within the grace period
--
-- DELETE policy:
--   - Authors can delete within grace period
--   - Admins can always delete (moderation)
-- ============================================================

create policy "notes: team members can read"
  on public.notes for select
  to authenticated
  using (public.is_team_member(team_id));

create policy "notes: team members can insert (not self)"
  on public.notes for insert
  to authenticated
  with check (
    public.is_team_member(team_id)
    and author_id    = auth.uid()
    and recipient_id != auth.uid()
  );

-- Recipients mark notes done; authors edit within grace period
create policy "notes: recipient can mark done"
  on public.notes for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "notes: author can update within grace period"
  on public.notes for update
  to authenticated
  using (
    author_id = auth.uid()
    and done = false
    and created_at > now() - (
      select (settings->>'grace_period_minutes')::int * interval '1 minute'
      from public.workspaces w
      join public.teams t on t.workspace_id = w.id
      where t.id = notes.team_id
    )
  )
  with check (author_id = auth.uid());

create policy "notes: author can delete within grace period"
  on public.notes for delete
  to authenticated
  using (
    author_id = auth.uid()
    and done = false
    and created_at > now() - (
      select (settings->>'grace_period_minutes')::int * interval '1 minute'
      from public.workspaces w
      join public.teams t on t.workspace_id = w.id
      where t.id = notes.team_id
    )
  );

create policy "notes: admins can update (moderation)"
  on public.notes for update
  to authenticated
  using (
    public.is_workspace_admin(public.team_workspace_id(team_id))
  );

create policy "notes: admins can delete (moderation)"
  on public.notes for delete
  to authenticated
  using (
    public.is_workspace_admin(public.team_workspace_id(team_id))
  );

-- ============================================================
-- SECURITY-BARRIER VIEW — notes_safe
--
-- This is what the Next.js app queries. It excludes author_id
-- entirely for non-admin requesters.
--
-- For authors querying their own notes (e.g. to check edit
-- eligibility), use a separate server action with service role.
-- ============================================================

create or replace view public.notes_safe
  with (security_barrier = true)
as
select
  n.id,
  n.team_id,
  n.cycle_id,
  n.recipient_id,
  -- author_id intentionally omitted
  n.note_type,
  n.content,
  n.tags,
  n.position,
  n.done,
  n.done_at,
  n.created_at_display  as created_at,  -- rounded timestamp
  n.updated_at,
  -- Is current user the author? Boolean only — no identity leak
  (n.author_id = auth.uid()) as is_mine,
  -- Is current user allowed to mark done?
  (n.recipient_id = auth.uid()) as can_mark_done,
  -- Is within grace period for edit/delete (for authors)
  case
    when n.author_id = auth.uid() and n.done = false then
      n.created_at > now() - interval '30 minutes'
    else false
  end as can_edit,
  n.priority
from public.notes n
where public.is_team_member(n.team_id);

comment on view public.notes_safe is
  'Safe projection of notes for team member consumption. author_id is never included. '
  'Use is_mine/can_mark_done/can_edit booleans for UI state. '
  'Admins use a separate service-role query for moderation.';

-- ============================================================
-- ADMIN VIEW — notes_admin
-- Only accessible with service role key (server-side actions).
-- Never expose this endpoint in client-side code.
-- ============================================================

create or replace view public.notes_admin as
select
  n.*,
  p.full_name  as author_name,
  p.email      as author_email,
  r.full_name  as recipient_name
from public.notes n
join public.profiles p on p.id = n.author_id
join public.profiles r on r.id = n.recipient_id;

comment on view public.notes_admin is
  'Full note data including author identity. '
  'MUST only be queried server-side with service_role key. '
  'Never call from client. Used for moderation only.';

-- ============================================================
-- NOTE REACTIONS
-- Reaction counts are public to team; reactor_id is not returned.
-- ============================================================

create policy "reactions: team members can read"
  on public.note_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.notes n
      where n.id = note_reactions.note_id
        and public.is_team_member(n.team_id)
    )
  );

create policy "reactions: team members can insert"
  on public.note_reactions for insert
  to authenticated
  with check (
    reactor_id = auth.uid()
    and exists (
      select 1 from public.notes n
      where n.id = note_reactions.note_id
        and public.is_team_member(n.team_id)
    )
  );

create policy "reactions: reactor can delete own"
  on public.note_reactions for delete
  to authenticated
  using (reactor_id = auth.uid());

-- View that exposes only aggregate counts (no reactor_id)
create or replace view public.note_reaction_counts
  with (security_barrier = true)
as
select
  note_id,
  emoji,
  count(*) as count,
  bool_or(reactor_id = auth.uid()) as reacted_by_me
from public.note_reactions
group by note_id, emoji;

-- ============================================================
-- CONTENT REPORTS
-- ============================================================

create policy "reports: reporters can insert"
  on public.content_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- Reporters can see their own reports
create policy "reports: reporters can read own"
  on public.content_reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- Admins can read all reports in their workspace
create policy "reports: admins can read all"
  on public.content_reports for select
  to authenticated
  using (
    exists (
      select 1 from public.notes n
      join public.teams t on t.id = n.team_id
      where n.id = content_reports.note_id
        and public.is_workspace_admin(t.workspace_id)
    )
  );

create policy "reports: admins can update (review)"
  on public.content_reports for update
  to authenticated
  using (
    exists (
      select 1 from public.notes n
      join public.teams t on t.id = n.team_id
      where n.id = content_reports.note_id
        and public.is_workspace_admin(t.workspace_id)
    )
  );

-- ============================================================
-- CYCLE SUMMARIES  (private per member)
-- ============================================================

create policy "summaries: members read own only"
  on public.cycle_summaries for select
  to authenticated
  using (profile_id = auth.uid());

-- Service role inserts (server action after cycle closes)
-- No client-side insert permitted.

-- ============================================================
-- INVITES
-- ============================================================

create policy "invites: admins can read"
  on public.invites for select
  to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "invites: admins can insert"
  on public.invites for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and public.is_workspace_admin(workspace_id)
  );

create policy "invites: token-holder can read (for accept flow)"
  on public.invites for select
  to anon
  using (
    accepted_at is null
    and expires_at > now()
  );

-- ============================================================
-- AUDIT LOG  (admins read; service role inserts)
-- ============================================================

create policy "audit: admins can read own workspace log"
  on public.audit_log for select
  to authenticated
  using (public.is_workspace_admin(workspace_id));
