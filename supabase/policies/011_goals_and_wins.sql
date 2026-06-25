-- ============================================================
-- TeamPulse — Goals & Wins (personal growth tracking)
-- Migration: 011_goals_and_wins.sql
-- Run after: 010_author_delete_anytime.sql
--
-- The self-authored half of the growth loop, sitting beside the
-- peer-driven scorecard:
--   GOALS — a person's measurable targets for a feedback cycle
--           (title, optional competency, target, 0–100 progress, status,
--            due date).
--   WINS  — accomplishments logged through the cycle, optionally attached
--           to a goal as evidence so the goal accrues proof over time.
--
-- Both are PRIVATE to the author (owner-only CRUD) and gated on team
-- membership, so they live on the same competency axes as feedback but
-- are never visible to teammates, leads, or admins. `competency` is a
-- single optional note_tag (a goal/win has one axis, unlike a note's
-- note_tag[] array). Mirrors the owner + team-member pattern in
-- 005_note_evidence.sql; reuses public.set_updated_at() (001 schema).
-- ============================================================

create type goal_status as enum ('active', 'achieved', 'missed', 'dropped');

-- ── Goals ─────────────────────────────────────────────────────
create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id)           on delete cascade,
  cycle_id    uuid          references public.feedback_cycles(id) on delete set null,
  profile_id  uuid not null references public.profiles(id)        on delete cascade,

  title       text not null check (char_length(title) between 1 and 120),
  detail      text          check (detail is null or char_length(detail) <= 1000),
  competency  note_tag,                       -- optional, same axis as feedback
  target      text          check (target is null or char_length(target) <= 200),
  progress    integer not null default 0 check (progress between 0 and 100),
  status      goal_status not null default 'active',
  due_at      timestamptz,                    -- defaults to the cycle's ends_at (set in the action)

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_goals_owner_cycle on public.goals (profile_id, cycle_id);
create index idx_goals_team         on public.goals (team_id);

-- ── Wins ──────────────────────────────────────────────────────
create table public.wins (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id)           on delete cascade,
  cycle_id    uuid          references public.feedback_cycles(id) on delete set null,
  profile_id  uuid not null references public.profiles(id)        on delete cascade,
  goal_id     uuid          references public.goals(id)           on delete set null,

  title       text not null check (char_length(title) between 1 and 160),
  detail      text          check (detail is null or char_length(detail) <= 1000),
  competency  note_tag,
  happened_at date not null default current_date,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_wins_owner_cycle on public.wins (profile_id, cycle_id);
create index idx_wins_goal         on public.wins (goal_id);

-- ── updated_at triggers (reuse the shared bump function) ──────
create trigger trg_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create trigger trg_wins_updated_at
  before update on public.wins
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS — owner-only CRUD, gated on team membership.
-- A row is visible/writable ONLY to its author, AND the author must
-- still be a member of the row's team. Private to you.
-- ============================================================
alter table public.goals enable row level security;
alter table public.wins  enable row level security;

-- ── Goals policies ────────────────────────────────────────────
create policy "goals: owner can read own"
  on public.goals for select to authenticated
  using (profile_id = auth.uid() and public.is_team_member(team_id));

create policy "goals: owner can insert own"
  on public.goals for insert to authenticated
  with check (profile_id = auth.uid() and public.is_team_member(team_id));

create policy "goals: owner can update own"
  on public.goals for update to authenticated
  using      (profile_id = auth.uid())
  with check (profile_id = auth.uid() and public.is_team_member(team_id));

create policy "goals: owner can delete own"
  on public.goals for delete to authenticated
  using (profile_id = auth.uid());

-- ── Wins policies ─────────────────────────────────────────────
-- A win may only attach to a goal the SAME user owns (belt + suspenders
-- on top of the server action's ownership re-check).
create policy "wins: owner can read own"
  on public.wins for select to authenticated
  using (profile_id = auth.uid() and public.is_team_member(team_id));

create policy "wins: owner can insert own"
  on public.wins for insert to authenticated
  with check (
    profile_id = auth.uid()
    and public.is_team_member(team_id)
    and (
      goal_id is null
      or exists (
        select 1 from public.goals g
        where g.id = wins.goal_id and g.profile_id = auth.uid()
      )
    )
  );

create policy "wins: owner can update own"
  on public.wins for update to authenticated
  using      (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and public.is_team_member(team_id)
    and (
      goal_id is null
      or exists (
        select 1 from public.goals g
        where g.id = wins.goal_id and g.profile_id = auth.uid()
      )
    )
  );

create policy "wins: owner can delete own"
  on public.wins for delete to authenticated
  using (profile_id = auth.uid());
