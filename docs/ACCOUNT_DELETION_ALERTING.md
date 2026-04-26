# Account deletion — operator signals (minimal)

No third-party monitoring product is required. Use **structured script logs** (stdout JSON), **Postgres** (`v_account_deletion_open_ops` or ad hoc SQL), and optional **log-drain filters** (Vercel → Datadog / Axiom / CloudWatch, etc.).

## Signal severity (for triage)

| Level | Meaning | Examples |
|-------|---------|----------|
| **Informational** | FYI; no immediate page | Single `CLAIM_FAILED` (retry), benign storage “not found” warnings, `processing_idle_stale` when queue is intentionally slow. |
| **Warning** | Investigate soon | `stuck_running` in view or SQL, `old_pending`, repeated `CLAIM_FAILED`, elevated script errors in a window. |
| **Action required** | Fix or reconcile now | `last_error_code=FINALIZE`, any `failed_execution` with real errors, Auth delete failures, reconcile script refusing (data still present). |

Escalation: **owner / platform** for permission or Auth issues; **on-call** only if user data is incorrectly exposed or deletion is legally time-sensitive — use your org’s real contacts.

## 1. Log filters (stdout JSON)

Scripts emit one JSON object per line with:

- `source: "djcn"`
- `category: "account_deletion"`
- `context`: `execute-account-deletion` | `reconcile-account-deletion` | `account-deletion-ops-snapshot`
- optional `code`, `stage`, `level`

**Examples (conceptual — adapt to your log provider’s query language):**

| Intent | Filter on |
|--------|-----------|
| Any script error | `level=error` AND `category=account_deletion` |
| Finalize failures (partial run risk) | `code=FINALIZE` OR `detail` contains `FINALIZE` |
| Claim lost race | `code=CLAIM_FAILED` |
| Reconcile refused | `context=reconcile-account-deletion` AND `level=error` |
| Weekly snapshot | `context=account-deletion-ops-snapshot` |

**jq (local):** `your-log-stream | jq 'select(.category=="account_deletion" and .level=="error")'`

## 2. View: `v_account_deletion_open_ops`

Prefer **`SELECT * FROM public.v_account_deletion_open_ops`** (or **`npm run ops:account-deletion`**) instead of hand-writing stuck-run queries each time. Categories and severities are defined in migration `20260430220000_v_account_deletion_open_ops.sql`.

## 3. Stuck `execution_status=running` (detail query)

Logs alone cannot prove a stuck run. The **view** includes `stuck_running` when `updated_at` is older than **1 hour**. For raw table:

```sql
SELECT id, status, execution_status, execution_attempts, updated_at, last_execution_stage
FROM public.account_deletion_requests
WHERE execution_status = 'running'
  AND updated_at < now() - interval '1 hour'
ORDER BY updated_at ASC;
```

**Response:** If no active script process, operators use **`--ack-stale-run`** on the **execute** script (`execute:account-deletion`), then retry or **reconcile** as appropriate.

## 4. Repeated `last_error_code` patterns

Track recurring operational issues (e.g. storage permissions):

```sql
SELECT last_error_code, count(*) AS n
FROM public.account_deletion_requests
WHERE execution_status = 'failed'
  AND last_error_at > now() - interval '7 days'
GROUP BY last_error_code
ORDER BY n DESC;
```

## 5. What not to alert on

- **CLAIM_FAILED** on first attempt during overlapping operator tests — **retry once** before paging.
- Benign storage “not found” warnings during **execute** — usually safe.

## 6. Admin UI

`/admin/account-deletion` surfaces **finalize failure** and **long-running execution** hints; use with **`ACCOUNT_DATA_CONTROLS.md`** (execute → ack-stale → reconcile order) for recovery.

## 7. Incident link

See **`docs/INCIDENTS.md`** → *Account deletion operations* for escalation shorthand.

## 8. Ops digest (view summary, not logs)

**`npm run digest:account-deletion`** aggregates **`v_account_deletion_open_ops`** by **`ops_severity`** / **`ops_category`** — same vocabulary as the view and **`INCIDENTS.md`**. It does **not** replace log monitoring; it does **not** emit **CLAIM_FAILED** (that remains a **execute** script log signal). Optional webhook: **`docs/ACCOUNT_DELETION_OPS_DIGEST.md`**.
