-- ============================================================
-- TeamPulse — Note priority / objectives
-- Migration: 004_note_priority.sql
-- Run after: 003_fix_workspace_members_rls.sql
--
-- Adds a `priority` flag so a recipient can promote feedback they
-- want to act on into a ranked "Priorities" lane (their objectives).
-- Only the recipient changes it — covered by the existing
-- "notes: recipient can mark done" UPDATE policy (recipient_id = auth.uid()),
-- so no new policy is needed.
--
-- The notes_safe view (what the board reads) is recreated to expose it.
-- ============================================================

alter table public.notes
  add column if not exists priority boolean not null default false;

-- Recreate the safe view including `priority`. (created_at stays mapped to
-- the hour-rounded created_at_display; author_id is still never exposed.)
create or replace view public.notes_safe
  with (security_barrier = true)
as
select
  n.id,
  n.team_id,
  n.cycle_id,
  n.recipient_id,
  n.note_type,
  n.content,
  n.tags,
  n.position,
  n.done,
  n.done_at,
  n.created_at_display  as created_at,
  n.updated_at,
  (n.author_id = auth.uid())    as is_mine,
  (n.recipient_id = auth.uid()) as can_mark_done,
  case
    when n.author_id = auth.uid() and n.done = false then
      n.created_at > now() - interval '30 minutes'
    else false
  end as can_edit,
  n.priority
from public.notes n
where public.is_team_member(n.team_id);
