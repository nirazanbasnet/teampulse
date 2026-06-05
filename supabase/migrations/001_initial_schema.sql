-- ============================================================
-- TeamPulse — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type note_type    as enum ('general', 'strength', 'growth');
create type note_tag     as enum ('Communication','Technical','Collaboration','Leadership','Delivery');
create type user_role    as enum ('admin', 'member');
create type cycle_status as enum ('active', 'closed', 'archived');
create type report_status as enum ('pending', 'reviewed', 'dismissed', 'removed');

-- ============================================================
-- PROFILES  (extends auth.users)
-- ============================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- WORKSPACES  (top-level tenant)
-- ============================================================

create table public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  owner_id   uuid not null references public.profiles(id),
  settings   jsonb not null default '{
    "grace_period_minutes": 30,
    "note_char_limit": 400,
    "reactions_enabled": true,
    "min_team_size_for_anon": 3
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================

create table public.workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  role         user_role not null default 'member',
  invited_by   uuid references public.profiles(id),
  joined_at    timestamptz not null default now(),
  unique (workspace_id, profile_id)
);

-- ============================================================
-- TEAMS  (named groups within a workspace)
-- ============================================================

create table public.teams (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

-- ============================================================
-- TEAM MEMBERS
-- ============================================================

create table public.team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  added_by   uuid references public.profiles(id),
  added_at   timestamptz not null default now(),
  unique (team_id, profile_id)
);

-- ============================================================
-- FEEDBACK CYCLES
-- ============================================================

create table public.feedback_cycles (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  name       text not null,
  status     cycle_status not null default 'active',
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  closed_at  timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- NOTES  (the core feedback object)
--
-- ANONYMITY DESIGN
--   author_id is stored for admin moderation and author
--   self-service edits/deletes within grace period.
--   RLS policies NEVER expose author_id to the recipient
--   or other team members. See 002_rls_policies.sql.
--
--   created_at_display is hour-rounded to prevent timing
--   correlation attacks against author identity.
-- ============================================================

create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  cycle_id     uuid references public.feedback_cycles(id) on delete set null,

  recipient_id uuid not null references public.profiles(id) on delete cascade,

  -- SENSITIVE: never returned via API to non-admins
  author_id    uuid not null references public.profiles(id) on delete cascade,

  note_type    note_type not null default 'general',
  content      text not null check (char_length(content) between 10 and 400),
  tags         note_tag[] not null default '{}',
  position     integer not null default 0,

  done         boolean not null default false,
  done_at      timestamptz,

  created_at   timestamptz not null default now(),

  -- Hour-rounded (truncated) for display to non-authors.
  -- Uses date_bin (IMMUTABLE) rather than date_trunc on a timestamptz
  -- (STABLE — depends on the session timezone), which a generated
  -- column does not allow. Bins into 1-hour buckets aligned to the epoch.
  created_at_display timestamptz generated always as (
    date_bin('1 hour', created_at, timestamptz '1970-01-01 00:00:00+00')
  ) stored,

  updated_at   timestamptz not null default now(),

  -- Database-level self-feedback prevention
  constraint no_self_feedback check (author_id != recipient_id)
);

comment on column public.notes.author_id is
  'SENSITIVE — never returned to recipient or team members. Admin-only via moderation report path.';

comment on column public.notes.created_at_display is
  'Hour-rounded timestamp for display to non-authors. Prevents timing-based identity inference.';

-- ============================================================
-- NOTE REACTIONS  (emoji reactions — counts exposed, not identities)
-- ============================================================

create table public.note_reactions (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.notes(id) on delete cascade,
  reactor_id uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null check (emoji in ('👍','💡','❤️')),
  created_at timestamptz not null default now(),
  unique (note_id, reactor_id, emoji)
);

-- ============================================================
-- CONTENT REPORTS  (flagged notes — admin moderation queue)
-- ============================================================

create table public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references public.notes(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  status      report_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  admin_note  text,
  created_at  timestamptz not null default now(),
  unique (note_id, reporter_id)
);

-- ============================================================
-- CYCLE SUMMARIES  (AI-generated, private per-member summaries)
-- ============================================================

create table public.cycle_summaries (
  id           uuid primary key default gen_random_uuid(),
  cycle_id     uuid not null references public.feedback_cycles(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  summary_text text not null,
  model_used   text not null default 'claude-sonnet-4-20250514',
  generated_at timestamptz not null default now(),
  unique (cycle_id, profile_id)
);

comment on table public.cycle_summaries is
  'AI summaries are private — only the subject can read their own. Not exposed to admins or peers.';

-- ============================================================
-- INVITES
-- ============================================================

create table public.invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  team_id      uuid references public.teams(id) on delete cascade,
  email        text not null,
  role         user_role not null default 'member',
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by   uuid not null references public.profiles(id),
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOG  (append-only, admin actions)
-- ============================================================

create table public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_id     uuid references public.profiles(id) on delete set null,
  action       text not null,
  target_table text,
  target_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_notes_team_recipient   on public.notes (team_id, recipient_id);
create index idx_notes_team_cycle       on public.notes (team_id, cycle_id);
create index idx_notes_recipient_done   on public.notes (recipient_id, done);
create index idx_notes_position         on public.notes (recipient_id, position);
create index idx_team_members_profile   on public.team_members (profile_id);
create index idx_team_members_team      on public.team_members (team_id);
create index idx_workspace_members_prof on public.workspace_members (profile_id);
create index idx_reactions_note         on public.note_reactions (note_id);
create index idx_reports_status         on public.content_reports (status);
create index idx_reports_note           on public.content_reports (note_id);
create index idx_cycles_team_status     on public.feedback_cycles (team_id, status);

-- ============================================================
-- HELPER FUNCTIONS  (used by RLS policies)
-- ============================================================

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and profile_id   = auth.uid()
      and role         = 'admin'
  );
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.team_members
    where team_id    = p_team_id
      and profile_id = auth.uid()
  );
$$;

-- SECURITY DEFINER so policies on workspace_members can call it without
-- re-triggering workspace_members' own RLS (which would recurse).
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and profile_id   = auth.uid()
  );
$$;

create or replace function public.team_workspace_id(p_team_id uuid)
returns uuid language sql security definer stable as $$
  select workspace_id from public.teams where id = p_team_id;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger trg_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create trigger trg_cycles_updated_at
  before update on public.feedback_cycles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Set done_at when a note is marked done
create or replace function public.handle_note_done()
returns trigger language plpgsql as $$
begin
  if new.done = true and old.done = false then
    new.done_at = now();
  elsif new.done = false then
    new.done_at = null;
  end if;
  return new;
end;
$$;

create trigger trg_note_done_at
  before update on public.notes
  for each row execute function public.handle_note_done();
