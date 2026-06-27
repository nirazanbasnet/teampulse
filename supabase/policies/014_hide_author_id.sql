-- ============================================================
-- TeamPulse — Lock author_id away from clients (anonymity hardening)
-- Migration: 014_hide_author_id.sql
-- Run after: 013_security_invoker_views.sql
--
-- The `notes` table has a "team members can read" SELECT policy. With the
-- default table-level SELECT grant, that let a member read notes.author_id
-- DIRECTLY (e.g. `select author_id from notes`) — bypassing notes_safe and
-- de-anonymising feedback. This removes that:
--
--   1. is_note_author() — a SECURITY DEFINER helper so notes_safe can still
--      compute is_mine / can_edit WITHOUT the caller reading author_id.
--   2. notes_safe is recreated to use it (no direct author_id reference).
--   3. The table-level SELECT grant on notes is replaced with a column-level
--      grant on every column EXCEPT author_id. (A column-only REVOKE is a
--      no-op while a table-level grant exists, hence the revoke + re-grant.)
--
-- author_id is now reachable only by the service role and the definer
-- functions. RLS policies that reference author_id still work — policy
-- expressions are evaluated by the system and don't require the caller to
-- hold column privileges.
--
-- Idempotent: safe to re-run.
-- ============================================================

create or replace function public.is_note_author(p_note_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.notes
    where id = p_note_id and author_id = auth.uid()
  );
$$;

create or replace view public.notes_safe
  with (security_barrier = true, security_invoker = true)
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
  public.is_note_author(n.id)                      as is_mine,
  (n.recipient_id = auth.uid())                    as can_mark_done,
  (public.is_note_author(n.id) and n.done = false) as can_edit,
  n.priority
from public.notes n
where public.is_team_member(n.team_id);

-- Replace the table-level SELECT with a column-level grant that omits author_id.
revoke select on public.notes from anon, authenticated;
grant select (
  id, team_id, cycle_id, recipient_id, note_type, content, tags,
  position, done, done_at, priority, created_at, created_at_display, updated_at
) on public.notes to authenticated;
