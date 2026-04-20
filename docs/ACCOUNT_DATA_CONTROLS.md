# Account data — deletion requests, export, and operator runbook

DJ Community Network ships **one real user-data lifecycle path**: an **account deletion request** stored in Postgres (`account_deletion_requests`) with RLS, plus an **admin/owner queue** at `/admin/account-deletion`. That is **not** automated account erasure. One-click export is **not** implemented.

## What is automated vs manual

| Step | Automated in app? |
|------|---------------------|
| Member submits request (optional note) | **Yes** — row inserted; rate-limited (`accountDeletionRequest` in `USER_ACTION_RATE`). |
| Member withdraws pending request | **Yes** — status → `cancelled` via RLS. |
| Staff marks `processing` / `completed` | **Yes** — status + `staff_note` + `reviewed_*` fields (admin/owner only). |
| Delete Supabase Auth user, DB rows, storage objects | **No** — operators follow the runbook below (Dashboard / service role / SQL). |

## Operator runbook (order of operations)

Fulfill only after you trust the requester (signed-in ticket ties to `user_id` / `profile_id`). Typical order:

1. **Auth:** Remove or disable the user in Supabase Auth (`auth.users`) using the project Dashboard or Auth Admin API with **service role** (never expose the service key to the client).
2. **Application data:** Delete or anonymize rows keyed by `user_id` / `profile_id` (profiles, posts, follows, notifications, rooms, reports, etc.) respecting FK order and your retention policy. RLS does not replace this step.
3. **Storage:** Remove avatar, banner, and post media objects from the relevant Storage buckets/paths.
4. **Trust / moderation:** Resolve open reports or notes that reference the user so staff queues stay accurate.
5. **Ticket:** In `/admin/account-deletion`, set status to **completed** and add an internal **staff note** (e.g. completion date, Auth user id removed).

Marking **completed** in the UI without doing the above is a **process failure** — the UI is honest about that.

## Database

- Migration: `supabase/migrations/20260430180000_account_deletion_requests.sql`
- **RLS:** Members insert/select own rows; **admin + owner** (not moderators) read/update the queue; users may cancel their own `pending` request.

## Typed Supabase access

Server code uses `src/lib/supabase/account-deletion-table.ts` helpers so insert/update payloads stay aligned with `Database` types even if `supabase gen types` has not been re-run after the migration.

## Export / portability

- No automated export pipeline. Handle requests manually until product and legal scope exist.

## Environment variables (contact)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL` | Mailto on `/settings/data` and `/contact` when set |
| `NEXT_PUBLIC_ABUSE_CONTACT_EMAIL` | Abuse mailto on `/contact` when set |

Unset = UI shows **not configured**, not fake inboxes.
