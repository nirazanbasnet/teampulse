-- ============================================================
-- TeamPulse — Authors may delete their own feedback anytime
-- supabase/policies/010_author_delete_anytime.sql
--
-- Previously an author could only delete a note within the 30-minute
-- grace window. This lifts the time limit: an author may delete their
-- own note at any time, as long as the recipient hasn't marked it
-- "done". Both layers are updated together —
--   1. notes_safe.can_edit  → drives the "Delete note" UI affordance
--   2. the delete RLS policy → enforces it server-side
-- The grace window still governs *edits/moves* via the update policy;
-- only deletion is unbounded.
-- ============================================================

-- 1. Recompute can_edit without the time window (author + not done).
--    Full view recreated from 004_note_priority.sql; only can_edit changed.
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
  -- Author can delete their own note anytime, until it's marked done.
  (n.author_id = auth.uid() and n.done = false) as can_edit,
  n.priority
from public.notes n
where public.is_team_member(n.team_id);

-- 2. Server-side: drop the grace-period delete policy, allow author
--    to delete their own not-done note with no time bound.
drop policy if exists "notes: author can delete within grace period" on public.notes;

create policy "notes: author can delete own note"
  on public.notes for delete
  to authenticated
  using (
    author_id = auth.uid()
    and done = false
  );
