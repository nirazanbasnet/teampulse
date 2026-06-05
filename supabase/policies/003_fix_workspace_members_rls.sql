-- ============================================================
-- TeamPulse — Fix recursive RLS on workspace_members
-- Migration: 003_fix_workspace_members_rls.sql
-- Run after: 002_rls_policies.sql
--
-- PROBLEM
--   The "members can read own workspace roster" SELECT policy on
--   workspace_members queried workspace_members from inside its own
--   USING clause. Postgres raises:
--     infinite recursion detected in policy for relation "workspace_members"
--   …which makes every read of workspace_members (and the workspaces /
--   teams policies that depend on it) fail, so admin pages bounce to login.
--
-- FIX
--   Move the membership check into a SECURITY DEFINER function. The
--   function runs as its owner with RLS bypassed internally, so reading
--   workspace_members from within the policy no longer re-triggers the
--   policy. This mirrors is_team_member / is_workspace_admin in 001.
-- ============================================================

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and profile_id   = auth.uid()
  );
$$;

drop policy if exists "workspace_members: members can read own workspace roster"
  on public.workspace_members;

create policy "workspace_members: members can read own workspace roster"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));
