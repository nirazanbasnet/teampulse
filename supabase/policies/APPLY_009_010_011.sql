-- ============================================================
-- ONE-TIME APPLY BUNDLE (IDEMPOTENT) — paste into the Supabase SQL
-- editor for project nhghygobbjmagvtnnhyr and Run.
--
-- Safe to re-run: every statement is guarded (if not exists / drop-then-
-- create), so a partial earlier apply converges cleanly. Ordered
-- 009 -> 010 -> 011. Delete this file after applying — it is NOT a
-- numbered migration.
-- ============================================================


-- ▼▼▼ 009 — email notification preference ▼▼▼

alter table public.profiles
  add column if not exists email_notifications boolean not null default true;


-- ▼▼▼ 010 — author can delete own note anytime ▼▼▼

-- Recompute can_edit without the 30-minute window (author + not done).
create or replace view public.notes_safe
  with (security_barrier = true)
as
select
  n.id,
  n.team_id,
  n.cycle_id,
  n.recipient_id,
  n.note_type,
  n.content,
  n.tags,
  n.position,
  n.done,
  n.done_at,
  n.created_at_display  as created_at,
  n.updated_at,
  (n.author_id = auth.uid())    as is_mine,
  (n.recipient_id = auth.uid()) as can_mark_done,
  (n.author_id = auth.uid() and n.done = false) as can_edit,
  n.priority
from public.notes n
where public.is_team_member(n.team_id);

drop policy if exists "notes: author can delete within grace period" on public.notes;
drop policy if exists "notes: author can delete own note"            on public.notes;
create policy "notes: author can delete own note"
  on public.notes for delete to authenticated
  using (author_id = auth.uid() and done = false);


-- ▼▼▼ 011 — goals & wins ▼▼▼

do $$ begin
  if not exists (select 1 from pg_type where typname = 'goal_status') then
    create type goal_status as enum ('active', 'achieved', 'missed', 'dropped');
  end if;
end $$;

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id)           on delete cascade,
  cycle_id    uuid          references public.feedback_cycles(id) on delete set null,
  profile_id  uuid not null references public.profiles(id)        on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  detail      text          check (detail is null or char_length(detail) <= 1000),
  competency  note_tag,
  target      text          check (target is null or char_length(target) <= 200),
  progress    integer not null default 0 check (progress between 0 and 100),
  status      goal_status not null default 'active',
  due_at      timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_goals_owner_cycle on public.goals (profile_id, cycle_id);
create index if not exists idx_goals_team         on public.goals (team_id);

create table if not exists public.wins (
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
create index if not exists idx_wins_owner_cycle on public.wins (profile_id, cycle_id);
create index if not exists idx_wins_goal         on public.wins (goal_id);

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wins_updated_at on public.wins;
create trigger trg_wins_updated_at
  before update on public.wins
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;
alter table public.wins  enable row level security;

-- Goals policies
drop policy if exists "goals: owner can read own"   on public.goals;
create policy "goals: owner can read own"
  on public.goals for select to authenticated
  using (profile_id = auth.uid() and public.is_team_member(team_id));

drop policy if exists "goals: owner can insert own" on public.goals;
create policy "goals: owner can insert own"
  on public.goals for insert to authenticated
  with check (profile_id = auth.uid() and public.is_team_member(team_id));

drop policy if exists "goals: owner can update own" on public.goals;
create policy "goals: owner can update own"
  on public.goals for update to authenticated
  using      (profile_id = auth.uid())
  with check (profile_id = auth.uid() and public.is_team_member(team_id));

drop policy if exists "goals: owner can delete own" on public.goals;
create policy "goals: owner can delete own"
  on public.goals for delete to authenticated
  using (profile_id = auth.uid());

-- Wins policies
drop policy if exists "wins: owner can read own"   on public.wins;
create policy "wins: owner can read own"
  on public.wins for select to authenticated
  using (profile_id = auth.uid() and public.is_team_member(team_id));

drop policy if exists "wins: owner can insert own" on public.wins;
create policy "wins: owner can insert own"
  on public.wins for insert to authenticated
  with check (
    profile_id = auth.uid()
    and public.is_team_member(team_id)
    and (
      goal_id is null
      or exists (select 1 from public.goals g where g.id = wins.goal_id and g.profile_id = auth.uid())
    )
  );

drop policy if exists "wins: owner can update own" on public.wins;
create policy "wins: owner can update own"
  on public.wins for update to authenticated
  using      (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and public.is_team_member(team_id)
    and (
      goal_id is null
      or exists (select 1 from public.goals g where g.id = wins.goal_id and g.profile_id = auth.uid())
    )
  );

drop policy if exists "wins: owner can delete own" on public.wins;
create policy "wins: owner can delete own"
  on public.wins for delete to authenticated
  using (profile_id = auth.uid());
