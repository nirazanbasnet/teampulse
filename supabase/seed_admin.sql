-- ============================================================
-- TeamPulse — Bootstrap the first workspace + admin
-- Run ONCE, in the Supabase SQL editor, AFTER you have signed up
-- at /auth/login (signup creates your auth.users + profiles row).
--
-- There is no UI to create the first workspace/admin — every later
-- workspace member and team is managed through the /admin pages,
-- but the first admin has to exist before those pages are reachable.
--
-- 1. Set the email below to the address you signed up with.
-- 2. Optionally rename the workspace.
-- 3. Run it. Then open the app → /admin/teams to build teams.
-- ============================================================

with me as (
  select id from auth.users
  where email = 'nirajan@jobins.jp'   -- ← the admin account's signup email
),
new_ws as (
  insert into public.workspaces (name, slug, owner_id)
  select 'My Workspace', 'my-workspace', me.id from me
  -- if you re-run this, avoid a duplicate-slug error:
  on conflict (slug) do nothing
  returning id
),
ws as (
  -- works whether the workspace was just created or already existed
  select id from new_ws
  union all
  select id from public.workspaces where slug = 'my-workspace'
  limit 1
)
insert into public.workspace_members (workspace_id, profile_id, role)
select ws.id, me.id, 'admin'
from ws, me
on conflict (workspace_id, profile_id) do update set role = 'admin';

-- Verify:
-- select wm.role, w.name, p.email
-- from public.workspace_members wm
-- join public.workspaces w on w.id = wm.workspace_id
-- join public.profiles p on p.id = wm.profile_id;
