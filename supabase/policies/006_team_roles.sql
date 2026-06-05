-- ============================================================
-- TeamPulse — Team-level roles (lead / member)
-- Migration: 006_team_roles.sql
-- Run after: 005_note_evidence.sql
--
-- Adds a per-TEAM role on team_members. A "lead" can manage their own
-- team — add / remove members and assign team roles — without being a
-- workspace admin. Workspace admins can do this for every team.
-- (This is separate from workspace_members.role, which is org-wide.)
-- ============================================================

create type team_role as enum ('lead', 'member');

alter table public.team_members
  add column if not exists role team_role not null default 'member';

-- ── Helper functions (SECURITY DEFINER → no RLS recursion) ──

create or replace function public.is_team_lead(p_team_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.team_members
    where team_id    = p_team_id
      and profile_id = auth.uid()
      and role       = 'lead'
  );
$$;

create or replace function public.is_workspace_team_lead(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.workspace_id = p_workspace_id
      and tm.profile_id  = auth.uid()
      and tm.role        = 'lead'
  );
$$;

-- ── team_members: leads gain insert / delete / role-update ──
-- (Added alongside the existing admin policies — permissive policies OR.)

create policy "team_members: leads can insert"
  on public.team_members for insert
  to authenticated
  with check (public.is_team_lead(team_id));

create policy "team_members: leads can delete"
  on public.team_members for delete
  to authenticated
  using (public.is_team_lead(team_id));

-- Assign team roles: workspace admins (any team) or the team's own leads.
create policy "team_members: admins or leads can update"
  on public.team_members for update
  to authenticated
  using (
    public.is_workspace_admin(public.team_workspace_id(team_id))
    or public.is_team_lead(team_id)
  )
  with check (
    public.is_workspace_admin(public.team_workspace_id(team_id))
    or public.is_team_lead(team_id)
  );

-- ── workspace_members: leads may add people to the workspace ──
-- so that a lead adding a not-yet-onboarded user to their team also
-- grants the workspace membership RLS requires to see the board.

create policy "workspace_members: team leads can insert"
  on public.workspace_members for insert
  to authenticated
  with check (public.is_workspace_team_lead(workspace_id));
