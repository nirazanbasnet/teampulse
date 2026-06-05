-- ============================================================
-- TeamPulse — Evidence on feedback
-- Migration: 005_note_evidence.sql
-- Run after: 004_note_priority.sql
--
-- The RECIPIENT of a piece of feedback can attach "evidence" — short
-- notes / links describing how they acted on it. Evidence is authored
-- openly by the recipient (their own column), so it never touches the
-- anonymous AUTHOR of the feedback. Team members can read evidence as
-- proof the feedback was addressed.
-- ============================================================

create table public.note_evidence (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.notes(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index idx_note_evidence_note on public.note_evidence (note_id);

alter table public.note_evidence enable row level security;

-- Read: any member of the note's team can see its evidence.
create policy "evidence: team members can read"
  on public.note_evidence for select
  to authenticated
  using (
    exists (
      select 1 from public.notes n
      where n.id = note_evidence.note_id
        and public.is_team_member(n.team_id)
    )
  );

-- Insert: only the recipient of the note may add evidence, as themselves.
create policy "evidence: recipient can add"
  on public.note_evidence for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.notes n
      where n.id = note_evidence.note_id
        and n.recipient_id = auth.uid()
    )
  );

-- Delete: the recipient who wrote it can remove their own evidence.
create policy "evidence: author can delete own"
  on public.note_evidence for delete
  to authenticated
  using (author_id = auth.uid());
