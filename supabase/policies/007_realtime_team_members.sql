-- ============================================================
-- TeamPulse — Realtime for team membership
-- Migration: 007_realtime_team_members.sql
-- Run after: 006_team_roles.sql
--
-- Lets a user sitting on the "not on any team yet" screen be moved to
-- their board the instant an admin / lead adds them. The client
-- subscribes to INSERTs on team_members filtered to their own profile.
-- (A client-side poll is the fallback if this isn't run, just slower.)
-- ============================================================

alter publication supabase_realtime add table public.team_members;
