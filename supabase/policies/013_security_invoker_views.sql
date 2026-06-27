-- ============================================================
-- TeamPulse — Make helper views run as the querying user
-- Migration: 013_security_invoker_views.sql
-- Run after: 012_lead_cycles.sql
--
-- Fixes the Supabase "security_definer_view" advisor on notes_safe,
-- note_reaction_counts, and notes_admin. By default a view runs with
-- its CREATOR's permissions (bypassing the caller's RLS); security_invoker
-- makes it enforce the CALLER's RLS instead.
--
-- Behaviour is preserved:
--   • notes_safe            — `notes` has a "team members can read" SELECT
--                             policy, so the caller sees the same rows; the
--                             view still omits author_id.
--   • note_reaction_counts  — `note_reactions` likewise; reactor_id stays
--                             aggregated out.
--   • notes_admin           — exposes author identity, so it is ALSO revoked
--                             from anon/authenticated and left for the
--                             service role only (server-side moderation).
--
-- Idempotent: safe to re-run.
-- ============================================================

alter view public.notes_safe           set (security_invoker = true);
alter view public.note_reaction_counts set (security_invoker = true);

-- notes_admin: service-role only. The invoker flag clears the advisor; the
-- revoke is what actually prevents a team member from reading author identity
-- through it.
alter view public.notes_admin          set (security_invoker = true);
revoke all on public.notes_admin from anon, authenticated;
