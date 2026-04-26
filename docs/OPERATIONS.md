# DJ Community Network — operations

Concise runbook for running the app, CI, moderation, and staging checks.

## Environments

| Concern | Notes |
|--------|--------|
| **Supabase** | Production and staging should use separate projects. Apply migrations from `supabase/migrations/` in order. |
| **Secrets** | Never commit `.env.local`. Server-only secrets (e.g. `SUPABASE_SERVICE_ROLE_KEY`) stay on the host / CI secrets only. |
| **Public URL** | Set **`NEXT_PUBLIC_SITE_URL`** (e.g. `https://yourdomain.com`) in production for canonical URLs and Open Graph `metadataBase`. If unset, **`VERCEL_URL`** is used on Vercel only. Local dev can omit both. |
| **Search indexing** | Policy in `src/lib/meta/indexing.ts`. **Production Vercel** (`VERCEL_ENV=production`, `NODE_ENV=production`) allows indexing of **public** routes only; **preview** and **Vercel development** deployments are `noindex` + `robots.txt` disallow all. Non-Vercel production hosts must set **`NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true`**. Kill switches: **`NEXT_PUBLIC_INDEXING_DISABLED=true`** or **`NEXT_PUBLIC_SITE_INDEXING=off`**. `robots.txt` / `sitemap.xml` are gated the same way. |
| **Support / abuse mail** | Optional **`NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL`** and **`NEXT_PUBLIC_ABUSE_CONTACT_EMAIL`** for `/contact` and mailto links on `/settings/data`. |

## Site owner bootstrap

- The first **owner** role is expected to be set in the database (see migration comments in `site_wide_roles` / admin team flow) or via SQL before `/admin/team` is usable.
- `requireSiteOwnerPage` redirects non-owners; only owners manage staff roles in the UI.

## Moderation / staff

- **Moderation queue:** `/admin/moderation` — guarded by `requireCanModeratePage` (moderator / admin / owner) plus RLS on `content_reports` and related tables.
- **Admin home:** `/admin` — `requireSiteStaffPage`.
- **Account deletion queue:** `/admin/account-deletion` — `requireSiteStaffPage` (admin / owner only). Lists `pending` / `processing` rows; shows workflow + machine state and compact recovery hints. Ops view `v_account_deletion_open_ops`, weekly checklist **`docs/ACCOUNT_DELETION_ROUTINE_REVIEW.md`**, read-only **`npm run ops:account-deletion`**, optional digest **`npm run digest:account-deletion`** (**`docs/ACCOUNT_DELETION_OPS_DIGEST.md`** — webhook only when `ACCOUNT_DELETION_OPS_WEBHOOK_URL` is set). **Optional** recurring digest: GitHub Actions workflow **`account-deletion-digest.yml`** (manual `workflow_dispatch` + weekly schedule; disable by removing the `schedule` block). Scripts + signals: `docs/ACCOUNT_DATA_CONTROLS.md`, `docs/ACCOUNT_DELETION_ALERTING.md`, `docs/INCIDENTS.md` (deletion section).
- **Team roles:** `/admin/team` — `requireSiteOwnerPage` and `SUPABASE_SERVICE_ROLE_KEY` on the server for role mutations.
- Staff links in the shell are hidden from normal users; **authority is enforced on the server**, not by hiding UI alone.

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`.

**Steps:** `npm ci` → `lint` → `typecheck` → `vitest` → `next build` → Playwright Chromium install → `npm run test:e2e`.

**Required env (workflow `env`):**

- `NEXT_PUBLIC_SUPABASE_URL` — HTTPS URL (placeholder OK for build).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — JWT-shaped string (workflow provides a dummy for compile/e2e only).

**Optional repository secrets (for authenticated E2E):**

| Secret | Purpose |
|--------|---------|
| `E2E_EMAIL` | Test user email (fully onboarded profile). |
| `E2E_PASSWORD` | Test user password. |

If secrets are unset, **both** signed-in Playwright tests are skipped; public + redirect smoke tests still run.

**Staging / E2E requirements (detail):** `docs/STAGING.md`.

**Playwright in CI:** uses `npm run start` after `build` (see `playwright.config.ts`). Locally, `npm run test:e2e` uses `next dev` and can reuse an existing server on port 3000.

**After cloning:** run `npx playwright install chromium` (use `npx playwright install` if the host arch differs from the first install).

## Staging / E2E user

1. Create a dedicated Supabase **non-production** project (or schema-isolated branch if you use branching).
2. Run migrations; configure Auth email/password for a test account.
3. Sign up (or insert user) and **complete onboarding** so `/home` loads the feed (E2E asserts the “Home” heading).
4. Put credentials in GitHub Actions secrets `E2E_EMAIL` / `E2E_PASSWORD`, or export them locally when running `npm run test:e2e`.

## Analytics vs monitoring

- **Product analytics:** `trackProductEvent` / optional GA4 — not error monitoring.
- **Server logs:** `logServerError` / `logServerWarning` in `src/lib/observability/server-log.ts` — JSON in production with **`category`** (`database`, `storage`, `moderation`, `rooms`, `profile`, `notifications`, `engagement`, `discovery`, `site`, `account_deletion`, etc.) plus `context`, `name`, `message`. No user-generated content or PII. Lifecycle info uses `logServerInfo` (same shape, `level: info`). Operator deletion script logs JSON to stdout with `category: account_deletion` (run outside the Next.js server).
- **Optional action timing:** `reportServerActionDuration` in `src/lib/observability/instrumentation.ts` — see **`docs/OBSERVABILITY.md`**.
- **Aggregation:** Point your host’s log drain (e.g. Vercel → Datadog / Axiom / CloudWatch) at stdout; filter on `source:"djcn"` and `category`. This is not a substitute for APM — add tracing if you need request-level drill-down.

## Rate limits (application layer)

- **Primary:** `userActionRateLimitAllowed` in `src/lib/rate-limit/user-action-rate-limit.ts` — same limits and identifier shape as Phase 7 (`userId` + action key).
- **Distributed (recommended for scale-out):** set **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** (e.g. [Upstash](https://upstash.com/) Redis). Uses `@upstash/ratelimit` sliding windows.
- **Policy (production):**
  - **No Upstash env:** still **fail-open** — in-memory limits apply so users keep posting; **`NODE_ENV===production`** emits **one** structured warn: `production_using_in_memory_rate_limits_configure_upstash_for_multi_instance` (multi-instance without Redis is unsafe for fair limits).
  - **Upstash configured but request errors:** **fail-open** to in-memory for that request path + **one** warn `upstash_unavailable_using_memory_fallback` per process until Redis recovers.
  - **Local/dev:** no production-only warns; single-instance in-memory is normal.
- **Actions covered:** post create, room messages (per room), reports, block/unblock, likes/saves/comments/follows, **account deletion request submit** (`accountDeletionRequest`: 3 per 24h per user).

## Data & performance docs

- **Backups / retention / RLS audit reminders:** `docs/DATA_SAFETY.md`
- **Rough latency targets for key flows:** `docs/PERFORMANCE.md`
- **Optional SQL hygiene (manual, opt-in):** `docs/DATA_HYGIENE.md`
- **Incident response:** `docs/INCIDENTS.md`
- **Account deletion / export roadmap (honest):** `docs/ACCOUNT_DATA_CONTROLS.md`
- **Observability depth:** `docs/OBSERVABILITY.md`
- **Staging & CI E2E expectations:** `docs/STAGING.md`
- **Legal vs code readiness (blunt):** `docs/LAUNCH_LEGAL.md`

## Launch / beta checklist (short)

- [ ] CI green on default branch.
- [ ] Staging Supabase + smoke e2e with real `E2E_*` secrets.
- [ ] Production env vars set (`NEXT_PUBLIC_*`, service role only on server).
- [ ] First site owner assigned in DB.
- [ ] Storage buckets and CORS verified for media uploads.
- [ ] Moderation workflow agreed (who reviews, SLA expectations).
- [ ] Legal: replace Terms / Privacy placeholders; set real `support@` / `abuse@` on `/contact`.
- [ ] Upstash (or equivalent) for rate limits if running multiple instances.
