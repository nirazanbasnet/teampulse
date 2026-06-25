-- ============================================================
-- TeamPulse — Email notification preference
-- supabase/policies/009_email_notifications.sql
--
-- Per-user opt-out for "you received new feedback" emails.
-- Defaults ON so existing members keep getting notified; each
-- member can disable it from their account menu. The owner-update
-- RLS policy on profiles already lets a user change their own row.
-- ============================================================

alter table public.profiles
  add column if not exists email_notifications boolean not null default true;
