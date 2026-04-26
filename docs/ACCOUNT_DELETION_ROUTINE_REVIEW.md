# Account deletion — routine review (weekly)

Lightweight habit, not automation. **No cron in this repo** — run on a schedule your team agrees on (e.g. weekly standup or calendar reminder).

## 1. Snapshot (read-only)

With `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` in the environment:

```bash
npm run ops:account-deletion
```

Prints one JSON object with `count` and `rows` from `public.v_account_deletion_open_ops`, sorted by severity then `updated_at`. **Does not write** to the database.

**Optional digest (counts + highlights + optional webhook):**

```bash
npm run digest:account-deletion
```

See **`docs/ACCOUNT_DELETION_OPS_DIGEST.md`** — same view, aggregated; notifications only if you configure a real webhook URL (no fake defaults). **Optional:** GitHub Actions **`.github/workflows/account-deletion-digest.yml`** (`workflow_dispatch` or weekly cron; skips cleanly if Supabase secrets are not set).

## 2. Same query in SQL editor

```sql
SELECT id, status, execution_status, ops_category, ops_severity,
       last_error_code, last_execution_stage, updated_at, profile_handle_snapshot
FROM public.v_account_deletion_open_ops
ORDER BY
  CASE ops_severity
    WHEN 'action_required' THEN 0
    WHEN 'warning' THEN 1
    WHEN 'informational' THEN 2
    ELSE 3
  END,
  updated_at ASC;
```

## 3. Weekly checklist (5–10 minutes)

| Step | Action |
|------|--------|
| 1 | Run snapshot or SQL; note `action_required` rows first. |
| 2 | **finalize_reconcile_candidate** → confirm Auth/profile gone, then `npm run reconcile:account-deletion` (see `ACCOUNT_DATA_CONTROLS.md`). |
| 3 | **stuck_running** → confirm no live script; then `execute:account-deletion` with `--ack-stale-run` if needed. |
| 4 | **failed_execution** (other codes) → fix root cause (storage, permissions), re-run execute. |
| 5 | **old_pending** / **processing_idle_stale** → member or staff follow-up; not always technical. |
| 6 | Skim `docs/ACCOUNT_DELETION_ALERTING.md` log filters if incidents occurred that week. |

## 4. Thresholds (tunable in migration)

| Category | Rule (in `v_account_deletion_open_ops`) |
|----------|----------------------------------------|
| Stuck run | `execution_status=running` and `updated_at` older than **1 hour** |
| Old pending | `status=pending` and `created_at` older than **14 days** |
| Idle processing | `status=processing`, `execution_status=idle`, `updated_at` older than **7 days** |

Change intervals in `supabase/migrations/20260430220000_v_account_deletion_open_ops.sql` if your SLA differs.
