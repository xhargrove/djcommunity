# Staging and CI — what must be real

End-to-end tests prove behavior against a **real** Supabase-backed app, not mocks.

## Minimum for meaningful E2E

1. **Supabase project** (staging or disposable) with migrations applied through `20260430240000_mashup_mixtape_posts.sql` (includes mashup/mixtape link posts; apply all prior migrations in order).
2. **Auth:** Email/password enabled; a test user that has **completed onboarding** (profile row exists) so `/home` and `/settings/data` load without redirecting to `/onboarding`.
3. **GitHub Actions (optional but recommended):** Repository secrets `E2E_EMAIL` and `E2E_PASSWORD` matching that user. Without them, signed-in Playwright tests are **skipped**; CI still runs public smoke and build.
4. **CI workflow env:** The workflow already sets placeholder `NEXT_PUBLIC_SUPABASE_*` for compile/build only. For **authenticated** tests to run in CI, those env vars must point at a project where the test user exists — i.e. override with **staging project URL + anon key** via encrypted secrets if you want CI to hit a real API (advanced; many teams run authenticated E2E only locally against `.env.local`).
5. **Account deletion script (operators):** `npm run execute:account-deletion` needs `SUPABASE_SERVICE_ROLE_KEY`; keep it in `.env.local` locally or a secrets manager — **not** in GitHub Actions for routine CI. Use dry-run against staging when validating operator workflows.

## What CI proves today

When `E2E_*` secrets are set and the user can sign in against the configured Supabase:

- **Sign in → Home** — feed shell visible.
- **Sign in → `/settings/data`** — “Your data” and account deletion request section load (Phase 11).

That is intentionally small scope; it avoids brittle full composer flows while still proving session + routing + a critical account surface.

## Local

Copy `.env.example` → `.env.local` with real staging URLs/keys and run `npm run dev` or `npm run start` after `npm run build`, then `npm run test:e2e`.
