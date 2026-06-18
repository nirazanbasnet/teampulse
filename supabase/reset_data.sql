-- ============================================================
-- JoBinsPulse — Reset to a clean slate
-- Run in the Supabase SQL editor (Dashboard → SQL editor).
--
-- KEEPS:    ONE admin account (auth user + profile), its workspace,
--           and its admin membership — so you can log straight back
--           in and start building teams from /admin/teams.
-- DELETES:  every team, member, note, reaction, evidence, cycle,
--           AI summary, report, invite, audit entry — and every
--           OTHER user account.
--
-- ⚠️  IRREVERSIBLE. Consider a backup first
--     (Dashboard → Database → Backups) if you're unsure.
-- ============================================================

-- ── STEP 0 — set + VERIFY the account to keep ───────────────
-- Change the email below if needed, then run ONLY this SELECT first.
-- It must return EXACTLY the admin account you want to keep before
-- you run Step 1. If it returns nothing or the wrong row, stop.

select id, email, created_at
from auth.users
where email = 'nirajan@jobins.jp';   -- ← the admin to KEEP

-- ── STEP 1 — wipe everything else ───────────────────────────
-- Run this block only after Step 0 confirmed the right account.

begin;

-- Feedback + team data (children first; most also cascade from teams).
delete from public.audit_log;
delete from public.content_reports;
delete from public.cycle_summaries;
delete from public.note_evidence;
delete from public.note_reactions;
delete from public.notes;
delete from public.feedback_cycles;
delete from public.team_members;
delete from public.teams;
delete from public.invites;

-- Any workspace NOT owned by the keeper.
delete from public.workspaces
where owner_id <> (select id from auth.users where email = 'nirajan@jobins.jp');

-- Every OTHER account — cascades to their profile + remaining memberships,
-- which also clears the dummy members out of the kept workspace.
delete from auth.users
where email <> 'nirajan@jobins.jp';

commit;

-- ── STEP 2 — confirm the clean slate (optional) ─────────────
-- select
--   (select count(*) from public.teams)             as teams,
--   (select count(*) from public.notes)             as notes,
--   (select count(*) from auth.users)               as users,          -- expect 1
--   (select count(*) from public.workspaces)        as workspaces,     -- expect 1
--   (select count(*) from public.workspace_members) as memberships;    -- expect 1
