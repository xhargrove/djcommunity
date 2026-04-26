# Account data — deletion requests, export, and operator runbook

DJ Community Network ships **one real user-data lifecycle path**: an **account deletion request** stored in Postgres (`account_deletion_requests`) with RLS, plus an **admin/owner queue** at `/admin/account-deletion`. The app does **not** expose service-role or destructive execution to browsers. One-click export is **not** implemented.

## What is automated vs manual

| Step | Automated in app? |
|------|---------------------|
| Member submits request (optional note) | **Yes** — row inserted; rate-limited (`accountDeletionRequest` in `USER_ACTION_RATE`). |
| Member withdraws pending request | **Yes** — status → `cancelled` via RLS. |
| Staff marks `processing` / `completed` | **Yes** — status + `staff_note` + `reviewed_*` fields (admin/owner only). |
| Delete Supabase Auth user, DB rows, storage objects | **Optional script** — `npm run execute:account-deletion` (service role on your machine or CI secret; never in the client). Manual Dashboard/SQL remains valid. |

## Operator runbook — execution order

Fulfill only after you trust the requester (signed-in ticket ties to `user_id` / `profile_id`).

**Preferred automated path** (after approval in `/admin/account-deletion`):

1. **Inspect:** Confirm ticket is `pending` or `processing`, `user_id` is set, and the request id matches your support case.
2. **Dry run:**  
   `npm run execute:account-deletion -- --request-id=<uuid> --dry-run`  
   Logs post counts and sample storage paths (no writes).
3. **Execute:**  
   `npm run execute:account-deletion -- --request-id=<uuid> --confirm=DELETE_ACCOUNT:<same-uuid>`  
   Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment (e.g. `.env.local`). **Never** commit the service key.

### Execution state (machine) vs workflow status (human)

| Column | Meaning |
|--------|---------|
| `status` | Human workflow: `pending` → `processing` / `completed` / `cancelled` (staff UI + script). |
| `execution_status` | Machine: `idle` (no run or reset), `running` (script in progress), `failed` (retryable), `succeeded` (script finished successfully). |
| `execution_attempts` | Incremented each time a live run **claims** the ticket. |
| `last_error_code` / `last_error_at` / `last_execution_stage` | Set on failure; short codes only (no user content). Staff see these on `/admin/account-deletion`. |
| `executed_at` | Set when `execution_status` becomes `succeeded` (required by DB check). |

**Distinguishing cases:** Pending review = `status=pending`, `execution_status=idle`. Approved but not executed = often `status=processing`, `execution_status=idle`. Executing = `execution_status=running`. Failed = `execution_status=failed` + error fields. Completed by script = `status=completed`, `execution_status=succeeded`. Completed only in the UI (manual) may show `status=completed`, `execution_status=idle` (historical or manual fulfillment).

**What the script does (in order):**

1. **Idempotent exits:** If `status=completed` and `execution_status=succeeded` → success no-op. If `status=completed` but execution is not `succeeded` → **refuses** (manual closure; do not re-run automation blindly).
2. **Stale run:** If `execution_status=running` (e.g. crashed process), re-run requires **`--ack-stale-run`** once to reset to `idle`, then run again with `--confirm`.
3. **Claim (atomic):** Postgres function `claim_account_deletion_execution` (migration `20260430210000`) sets `running`, increments `execution_attempts`, clears last-error fields in **one** statement — only `service_role` may call it. If the RPC returns `claimed: false`, another process holds the ticket or state does not match; **retry once** or confirm no concurrent operator. **CLAIM_FAILED** is expected under concurrency; it is not a product bug.
4. Removes `post_media` storage objects (benign “missing object” errors are skipped with a warning).
5. Removes `avatars` / `banners` paths for `${userId}/avatar` and `${userId}/banner`.
6. Sets workflow `status` to `processing` before Auth delete (if not already).
7. Deletes the Auth user via `auth.admin.deleteUser`. If the user is **already gone**, the script treats that as success and continues.
8. **Finalize:** Sets `status=completed`, `execution_status=succeeded`, `executed_at`, `reviewed_at`, and **appends** a `[script completed …]` line to `staff_note` (only if the row is still `execution_status=running` — avoids double-completion).

### Reconciliation (finalize failed but data may already be gone)

If **`last_error_code=FINALIZE`** (or Auth/profile already removed but the ticket never closed), the account may already be deleted while the row still shows **`failed`** or **`running`**. Do **not** mark completed in the UI without verifying.

1. **Dry run:** `npm run reconcile:account-deletion -- --request-id=<uuid> --dry-run`  
2. **Repair:** `npm run reconcile:account-deletion -- --request-id=<uuid> --confirm=RECONCILE:<same-uuid>`

The reconcile script **refuses** if the Auth user or profile row **still exists** (honest completion only). If `user_id` is already null (SET NULL after Auth delete), it checks that no profile row remains for `profile_id` when that id is still set. It sets **`execution_status=succeeded`**, **`status=completed`**, **`executed_at`**, and appends a **`[reconciled …]`** line to **`staff_note`**.

**Alerting / log filters:** **`docs/ACCOUNT_DELETION_ALERTING.md`**.

### Operator visibility (no extra admin UI)

- **SQL view:** `public.v_account_deletion_open_ops` — open tickets that likely need attention (failed, stuck run, stale pending, idle processing). **Not** granted to `anon` / `authenticated`; use Supabase SQL editor or **`npm run ops:account-deletion`** (read-only JSON snapshot).
- **Optional digest:** **`npm run digest:account-deletion`** — aggregated counts + optional webhook (**`docs/ACCOUNT_DELETION_OPS_DIGEST.md`**); **no default URL**; stdout always shows whether a webhook is configured. **Optional schedule:** GitHub Actions **`account-deletion-digest.yml`** (same script via **`digest:account-deletion:ci`** — no duplicate logic).
- **Weekly habit:** **`docs/ACCOUNT_DELETION_ROUTINE_REVIEW.md`**.
- **Incidents:** **`docs/INCIDENTS.md`** (account deletion section).

**Terminology (single story):** **execute** = `npm run execute:account-deletion` (destructive, `--confirm=DELETE_ACCOUNT:<uuid>`). **Ack stale** = same script with `--ack-stale-run` when `execution_status=running` is abandoned. **Reconcile** = `npm run reconcile:account-deletion` with `--confirm=RECONCILE:<uuid>` only after verifying Auth/profile are already gone.

Database rows tied to that user follow normal FK/cascade behavior; `account_deletion_requests` uses **ON DELETE SET NULL** on `user_id`/`profile_id` so the **ticket row is retained** as an audit record. Table-level cleanup assumptions: **`docs/ACCOUNT_DELETION_CLEANUP.md`**.

**Manual alternative:** Supabase Dashboard (Auth user delete) + SQL/storage cleanup + mark completed in `/admin/account-deletion` — same process discipline; the script only automates the boring parts.

Marking **completed** in the UI without deleting data is still a **process failure** — the UI is honest about that.

## Retention / audit posture

- **Decision:** Keep **operational/audit rows** for `account_deletion_requests` after the account is gone.
- **Schema:** Migration `20260430190000_account_deletion_retention.sql` adds `profile_handle_snapshot`, nullable `user_id`/`profile_id` with **ON DELETE SET NULL**, and tightens the immutability trigger so IDs are not swapped (only nulling for archival).
- **Tradeoff:** You retain history for compliance/support; nullable FKs require operators to rely on `id` + snapshots when the user row is gone. **Do not** add ON DELETE CASCADE from tickets to auth/profile.

## Database

- Migrations: `20260430180000_account_deletion_requests.sql`, `20260430190000_account_deletion_retention.sql`, `20260430200000_account_deletion_execution.sql`, `20260430210000_account_deletion_claim_rpc.sql`, `20260430220000_v_account_deletion_open_ops.sql`
- **RLS:** Members insert/select own rows; **admin + owner** read/update the queue; users may cancel their own `pending` request.

## Typed Supabase access

Server code uses `SupabaseClient<Database>` from `createServerSupabaseClient()` and `src/lib/supabase/account-deletion-table.ts` helpers. Regenerate `src/types/database.ts` when the DB schema changes:

```bash
npx supabase gen types typescript --linked --schema public > src/types/database.ts
# or --local when Supabase CLI + Docker are available
```

## Export / portability

- No automated export pipeline. Handle requests manually until product and legal scope exist.

## Environment variables (contact)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL` | Mailto on `/settings/data` and `/contact` when set |
| `NEXT_PUBLIC_ABUSE_CONTACT_EMAIL` | Abuse mailto on `/contact` when set |

Unset = UI shows **not configured**, not fake inboxes.
