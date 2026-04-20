# Engineering handoff — DJ Community Network → Blackfire

**Date:** April 2026  
**From:** Current build / product owner  
**To:** Blackfire (tech team)  
**Purpose:** Change engineering ownership and align the team on architecture, scope, and how to run and extend the app.

---

## 1. Product snapshot

**DJ Community Network** is a Next.js web app for DJs: profiles (taxonomy-backed city / genres / DJ type), social feed (posts + media), engagement (likes, comments, saves, follows), **rooms** (public/private, memberships), **realtime room chat**, **discovery** (search + filters + trending from real DB signals), and **in-app notifications** (likes, comments, follows, room activity to room creators).  

**Explicitly out of scope so far:** push notifications, voice/video, advanced recommendation engines.

Blackfire should treat this document as the **onboarding spine** and verify details against the repo and Supabase project.

---

## 2. Stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend / data | Supabase (Postgres, Auth, Storage, Realtime where enabled) |
| Auth session | `@supabase/ssr` + middleware; server actions use cookie-bound server client |
| Validation | Zod (e.g. posts, engagement, room messages) |

**Scripts:** `npm run dev` | `typecheck` | `lint` | `build` | `start`

---

## 3. Repository map (high level)

| Area | Location |
|------|----------|
| App routes | `src/app/` — `(public)`, `(auth)`, `(app)` groups |
| Server actions | `src/actions/` |
| Supabase clients | `src/lib/supabase/` (browser + server) |
| Domain logic | `src/lib/posts/`, `src/lib/profile/`, `src/lib/rooms/`, `src/lib/discovery/`, `src/lib/notifications/` |
| Canonical routes | `src/lib/routes.ts` |
| DB types (hand-maintained) | `src/types/database.ts` — **regenerate** after schema changes (`supabase gen types typescript`, see README) |
| Migrations | `supabase/migrations/` — **apply in timestamp order** |

---

## 4. Database & migrations

Migrations are sequential (examples — see folder for full list):

- Profiles, storage buckets  
- Taxonomy (cities, genres, `dj_types`, `profile_genres`)  
- Posts, feed, post media  
- Engagement (likes, comments, saves, follows)  
- Rooms + memberships  
- Room messages + Realtime publication for `room_messages`  
- Discovery (pg_trgm indexes, RPCs for trending/rising)  
- Notifications table + **SECURITY DEFINER triggers** (trusted inserts; RLS for read/update by recipient)

**Important for Blackfire**

- Do **not** rely on client-only checks for security; **RLS and server actions** enforce rules.  
- Notifications are written by **database triggers**, not only app code — see `20260427000000_notifications.sql`.  
- If the SQL editor warns about RLS on new tables, ensure the **full** migration (including `ENABLE ROW LEVEL SECURITY` and policies) ran.  
- After schema changes, regenerate `src/types/database.ts` or merge carefully.

---

## 5. Environment & secrets

- Local: copy `.env.example` → `.env.local` (see root `README.md`).  
- Required public vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.  
- **Never** commit real keys; rotate if a handoff bundle ever leaked.  
- Optional: `SUPABASE_SERVICE_ROLE_KEY` for future admin/automation (server-only).

Supabase Dashboard: set **Site URL** and redirect URLs for Auth to match dev/prod origins.

---

## 6. Runtime configuration (Next.js)

- **Server Actions body size:** `next.config.ts` sets `experimental.serverActions.bodySizeLimit` (e.g. ~55MB) so large **video** uploads in create-post are not rejected by the default 1MB limit.  
- **Images:** remote patterns for Supabase storage host are derived from `NEXT_PUBLIC_SUPABASE_URL`.

Restart the dev server after changing `next.config`.

---

## 7. Feature areas (for roadmap planning)

| Domain | Notes |
|--------|--------|
| Feed | `listFeedPosts` hydrates posts + media + engagement in batches (watch N+1 if you add heavy fields). |
| Rooms | Visibility + membership; chat only for members; realtime channel per room in `room-chat` client. |
| Discovery | Taxonomy slugs in query string; RPCs for trending/rising; caption search bounded. |
| Notifications | List + unread count in shell; mark read actions; triggers on like/comment/follow/room message (creator). |

---

## 8. Known constraints / follow-ups

- **Post deep links:** like/comment notifications may still point to `/home` until a dedicated post URL exists.  
- **useActionState:** forms migrated from deprecated `useFormState` (React 19).  
- **Supabase RPC typing:** some discovery RPCs use a small `rpcUuidArray` helper where generated client types did not infer `rpc()` args cleanly.  
- **Notifications migration:** if SQL was applied piecemeal, confirm triggers/functions match repo; prefer `supabase db push` or full-file runs.

---

## 9. Suggested onboarding checklist for Blackfire

1. Clone repo, `npm install`, configure `.env.local`, run `npm run dev`.  
2. Link Supabase CLI (`supabase link`) and confirm migrations applied to the target project.  
3. Run `typecheck`, `lint`, `build` in CI.  
4. Walk: sign-up → onboarding → home → create (post) → explore → room → notifications.  
5. Align on **product direction** (priorities, branding, mobile, push, moderation) in a separate product doc — this file is **engineering** handoff only.

---

## 10. Contact & ownership

- **Engineering owner:** Blackfire (from handoff acceptance).  
- Update this file when major architecture or ownership changes.

---

*End of handoff document.*
