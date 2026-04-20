# DJ Community Network — product-facing redesign (Blackfire)

Canonical direction: **Instagram surface energy** + **Discord/community structure** + **DJ-native utility**. Mobile-first, dark-first, visual-first.

---

## A. Product gap report

### Conflicts with the new direction (typical symptoms)

- **Generic “web app” chrome** — long horizontal link rows, settings-forward labels (“Public profile”, “Edit profile” as primary nav), light use of media hierarchy.
- **Composer on Home** — splits attention; creation should feel intentional (tab + dedicated surface), not like a forum “new thread” above posts.
- **“Discover” naming** — reads backend/search; **Explore** matches the Instagram mental model for serendipity + culture browsing.
- **Rooms risk** — if presented as dense lists or gamer-adjacent UI, it breaks the premium nightlife tone.

### Preserved (keep)

- **Supabase schema**, RLS, realtime rooms, notifications pipeline, feed queries, discovery RPCs (`src/lib/discovery/`), taxonomy.
- **App Router** layout groups, server components for data-heavy pages, client islands for forms/engagement.
- **Domain types** and server actions patterns.

### Must change now (this phase)

- **5-tab shell**: Home · Explore · Create · Rooms · Profile (`src/components/layout/mobile-tab-nav.tsx`, `app-shell.tsx`).
- **Routes**: `/explore` (+ city) as primary discovery URL; **redirects** from `/discover/*` (`next.config.ts`).
- **Home** = feed + **New post** CTA → `/create` (not inline composer).
- **Create** = `/create` hosting `CreatePostForm`.
- **Visual hierarchy** — feed cards: larger radius, subtle ring/shadow (`post-card.tsx`, `create-post-form.tsx`).

### Can wait (next phases)

- **Stories / reels-style** horizontal rails, clip-first sub-feeds.
- **Threaded room messages**, rich mod tools, pinned UX beyond current schema.
- **Following-only** vs global feed toggle, algorithm labels.
- **Profile** redesign: hero, stats, clips grid, “rooms I’m in” as identity signals (partially data-ready).

---

## B. IA / app shell plan

| Tab      | Route(s) | Role |
|----------|-----------|------|
| Home     | `/home`   | Main feed engine; media-first list. |
| Explore  | `/explore`, `/explore/[citySlug]` | DJs, rooms, posts, cities, trending (real DB signals). |
| Create   | `/create` | Friction-light composer. |
| Rooms    | `/rooms`, `/rooms/[slug]`, … | Community layer; keep calm, wide spacing, not dense Discord clone. |
| Profile  | `/u/[handle]`, `/profile/edit`, `/onboarding` | Identity; tab lands on **public** profile or onboarding. |

**Header (minimal):** brand link home, **Alerts** (notifications), account + logout. **No** duplicate primary nav in header — tabs are the product spine.

**Mobile:** fixed bottom tab bar with safe-area padding; main content `pb-[calc(4.25rem+env(safe-area-inset-bottom))]`.

**Redirects:** `301`/`308`-style permanent redirects from legacy `/discover` URLs.

---

## C. UI system plan

- **Layout:** max width `max-w-5xl` shell; primary content column can tighten to `max-w-xl` on Create for focus.
- **Cards:** `rounded-2xl`, `border-white/[0.06]`, `ring-1 ring-white/[0.04]`, `shadow-xl shadow-black/40` — **nightclub premium**, not flat admin panels.
- **Feed:** media blocks `rounded-xl`, aspect containers unchanged; **metadata secondary** to thumbnails/video.
- **Rooms:** reuse existing list/detail; next pass = **preview cards** (cover, member count, city/genre chips) and calmer typography — avoid gamer neon / dense channel lists.
- **Typography:** existing zinc scale; section labels `uppercase tracking-[0.2em]` sparingly for “Latest”-style rails.
- **Dark mode:** default; tokens in `globals.css` (`--background`, `--foreground`, `--border`).

---

## D. Implementation plan (phased)

| Phase | Scope | Key files |
|-------|--------|-----------|
| **1 — Shell + routes** | 5-tab nav, explore URL, redirects, slim header | `mobile-tab-nav.tsx`, `app-shell.tsx`, `routes.ts`, `next.config.ts` |
| **2 — Feed / create split** | Home feed-only, `/create`, revalidation | `home/page.tsx`, `create/page.tsx`, `actions/posts.ts` |
| **3 — Explore copy + IA** | Rename Discover → Explore in UI | `explore/page.tsx`, `explore/[citySlug]/page.tsx` |
| **4 — Card system** | Post + composer surfaces | `post-card.tsx`, `create-post-form.tsx` |
| **5 — Rooms polish** | Directory cards, spacing, role affordances | `rooms/*`, room components (TBD) |
| **6 — Profile presence** | Hero, grids, social proof | `u/[handle]/*`, profile components (TBD) |
| **7 — Notifications** | Actionable, grouped | `notifications/*` (TBD) |

---

## E. Execution status

- **Done:** Phase 1–4 as above (shell, routes, Home/Create split, Explore rename, card polish, redirects).
- **Next:** Rooms directory visual pass, profile identity layer, Explore trending rails (UI-only where data exists).
