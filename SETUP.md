# TeamPulse — Setup & Run (bun)

The app is fully scaffolded, builds clean, and runs. The only thing left is
wiring up **your** Supabase project (`nhghygobbjmagvtnnhyr`). Follow these steps.

> Package manager is **bun**. Stack: Next.js 14 (App Router) · React 18 ·
> Supabase (Postgres + RLS + Realtime + Auth) · dnd-kit · Recharts ·
> Anthropic SDK. No Tailwind/shadcn — components use inline styles + CSS vars
> in `src/app/globals.css` and the Tabler icon webfont.

---

## 1. Apply the database schema

Open the **Supabase SQL Editor** for project `nhghygobbjmagvtnnhyr`
(https://supabase.com/dashboard/project/nhghygobbjmagvtnnhyr/sql/new) and run
the two files **in order**:

1. Paste the entire contents of [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) → **Run**
   (tables, enums, triggers, the `handle_new_user` profile trigger, indexes).
2. Paste the entire contents of [`supabase/policies/002_rls_policies.sql`](supabase/policies/002_rls_policies.sql) → **Run**
   (RLS on every table + the `notes_safe` / `notes_admin` / `note_reaction_counts` views).

Run 001 first — 002 depends on the tables and helper functions it creates.

> CLI alternative: `supabase link --project-ref nhghygobbjmagvtnnhyr`, then paste
> both files via `supabase db query`. The SQL editor is simpler here because the
> policies live in `supabase/policies/`, which `supabase db push` does not scan.

## 2. Enable Realtime on the notes table

The board updates live via Supabase Realtime. In the same SQL editor, run:

```sql
alter publication supabase_realtime add table public.notes;
alter table public.notes replica identity full;
```

(`replica identity full` makes UPDATE payloads include old values, which the
board's realtime handler relies on.)

## 3. Fill in the remaining environment variables

`.env.local` already has your project URL and anon key. Add the **service-role
key** (Dashboard → Project Settings → API → `service_role` secret) and, if you
want AI cycle summaries, an Anthropic key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nhghygobbjmagvtnnhyr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...          # already set
SUPABASE_SERVICE_ROLE_KEY=...              # ADD THIS — server-only, bypasses RLS
ANTHROPIC_API_KEY=sk-ant-...               # optional, for AI summaries
```

The service-role key is required for moderation and AI summaries. **Never**
commit `.env.local` (it's git-ignored) and never expose the service-role key to
the browser.

## 4. (Optional) Regenerate the database types from your live schema

`src/lib/supabase/database.types.ts` is hand-authored to match the migrations
and the build passes with it. Once the schema is applied you can regenerate the
canonical version:

```bash
bunx supabase gen types typescript --project-id nhghygobbjmagvtnnhyr > src/lib/supabase/database.types.ts
```

## 5. Run it

```bash
bun install        # already done
bun run dev        # http://localhost:3000
```

Then create an account at `/auth/login`. The `handle_new_user` trigger
auto-creates your `profiles` row on signup. To become an admin you currently
need a workspace + `workspace_members` row with `role = 'admin'` (seed this in
the SQL editor for your first user, then use the admin pages to build teams).

---

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | Dev server (hot reload) |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | Next.js ESLint |

## What anonymity guarantees are already enforced

- `author_id` is stored but **never** projected by the `notes_safe` view the
  client reads (`002_rls_policies.sql`).
- DB `CHECK (author_id != recipient_id)` + a server-action re-check prevent
  self-feedback.
- `created_at` is hour-rounded (`created_at_display`) for non-authors.
- The realtime handler in `src/lib/hooks/use-board-realtime.ts` deletes
  `author_id` from payloads before it can enter React state.
- Service-role-only access to `notes_admin` (the view that includes author
  identity), used solely for moderation.
