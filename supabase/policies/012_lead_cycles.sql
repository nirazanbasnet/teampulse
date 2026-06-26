-- ============================================================
-- TeamPulse — Team leads can open (create) feedback cycles
-- Migration: 012_lead_cycles.sql
-- Run after: 011_goals_and_wins.sql
--
-- A team lead may open a cycle for a team they lead (in addition to
-- workspace admins, who can do it for any team). CLOSING a cycle stays
-- admin-only — it generates AI summaries and is enforced in the close
-- action (closeCycleAndGenerateSummaries), so no update policy is added.
-- Idempotent: safe to re-run.
-- ============================================================

drop policy if exists "cycles: leads can insert" on public.feedback_cycles;
create policy "cycles: leads can insert"
  on public.feedback_cycles for insert
  to authenticated
  with check (public.is_team_lead(team_id));
