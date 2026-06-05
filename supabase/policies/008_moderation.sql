-- ============================================================
-- TeamPulse — Moderation: AI flags + reveal-on-report
-- Migration: 008_moderation.sql
-- Run after: 007_realtime_team_members.sql
--
-- 1. content_reports.source — distinguishes member reports from
--    AI-moderation auto-flags.
-- 2. reporter_id becomes nullable so AI flags (no human reporter)
--    can be stored. AI reports are inserted with the service role,
--    so RLS is bypassed; member-report RLS (reporter_id = auth.uid())
--    is unchanged.
--
-- Author reveal is enforced in the server action + audit_log (no
-- schema change needed — author_id already lives on notes).
-- ============================================================

alter table public.content_reports
  add column if not exists source text not null default 'member';

alter table public.content_reports
  alter column reporter_id drop not null;
