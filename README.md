# MixerHQ

## Requirements

- Node.js 20+
- npm (or pnpm / yarn)

## Environment

Copy `.env.example` to `.env.local` and set:

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |

Optional (server-only, for future admin/service operations):

| Variable | Notes |
|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Never expose to the client. Only use in Server Actions / Route Handlers / server utilities. |

Public variables are validated at startup (see `src/lib/env/public.ts`). Invalid or missing values fail fast with a clear error.

### Supabase Auth (Phase 1)

In Supabase → **Authentication** → **URL configuration**, set **Site URL** to your deployed origin (e.g. `http://localhost:3000` in development). If email confirmation is enabled, users must confirm before a session is created.

## Scripts

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

## Routes

| Path | Access |
|------|--------|
| `/` | Public landing; signed-in users are redirected to `/home` by middleware. |
| `/login`, `/sign-up` | Public; signed-in users are redirected to `/home`. |
| `/home` | Protected; requires a DJ profile (otherwise redirects to `/onboarding`). |
| `/onboarding` | Protected; create profile (redirects to `/home` if profile exists). |
| `/profile/edit` | Protected; edit own profile and upload avatar/banner. |
| `/u/[handle]` | Public read-only profile page. |

## Profiles (Phase 2)

- One `profiles` row per auth user (`user_id` unique), `handle` unique (enforced in Postgres).
- Genres and DJ type options are defined in `src/lib/profile/constants.ts` (canonical lists).
- Avatars and banners use Supabase Storage buckets `avatars` and `banners`, paths `{user_id}/avatar` and `{user_id}/banner` (upsert replaces previous object).
- RLS: anyone can read profiles; users can insert/update only their own row.

Regenerate TypeScript DB types after schema changes:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

(Adjust if your project uses a different workflow.)

## Project layout

- `src/app/(public)/` — Public landing.
- `src/app/(auth)/` — Login and sign-up pages.
- `src/app/(app)/` — Authenticated area (`/home` and future app routes); shell + `getCurrentUser()` guard.
- `src/lib/auth/` — `getCurrentUser()`, safe redirect helper.
- `src/lib/supabase/` — Browser + server clients; middleware session refresh and auth redirects.
- `src/actions/` — Server Actions (e.g. `signOutAction`).
- `src/types/` — Shared types; generate Supabase `Database` types when the schema exists.

## Supabase types

When the database schema exists:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

(Requires [Supabase CLI](https://supabase.com/docs/guides/cli) and a linked project.)
