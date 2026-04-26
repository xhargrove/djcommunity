# Account deletion — optional ops digest

Read-only summary of `v_account_deletion_open_ops` with **optional** outbound webhook. **No writes** to product data. **No default destination** — if `ACCOUNT_DELETION_OPS_WEBHOOK_URL` is unset, nothing is sent; stdout JSON still lists `webhook_configured: false` so it is obvious notifications were never wired.

## Command

```bash
npm run digest:account-deletion
```

Optional: **`--force-webhook`** — POST to the webhook even when the digest only contains **informational** rows (normally skipped to reduce noise).

## What it does

1. Loads rows from **`v_account_deletion_open_ops`** (same view as **`npm run ops:account-deletion`**).
2. Prints **counts** by **`ops_severity`** (`action_required`, `warning`, `informational`) and **`ops_category`** (view categories — same names as in the migration).
3. Includes up to **10** **`action_required`** highlights (`id`, category, `updated_at`, `profile_handle_snapshot` only — no user messages).
4. Optionally **POSTs** to a webhook when configured and **notify rules** allow (see below).

## Environment variables

| Variable | Required | Behavior |
|----------|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role — same as other operator scripts. |
| `ACCOUNT_DELETION_OPS_WEBHOOK_URL` | No | If **unset**, **no HTTP POST**; stdout still shows full digest. **No placeholder URLs** in repo — set only when you have a real endpoint (Slack incoming webhook, internal gateway, Zapier, etc.). |
| `ACCOUNT_DELETION_OPS_WEBHOOK_BEARER` | No | If set, sent as `Authorization: Bearer …` on the webhook POST. |
| `ACCOUNT_DELETION_OPS_WEBHOOK_FORMAT` | No | `json` (default) — POST body matches the `digest_payload` shape in stdout. `slack` — POST `{"text":"…"}` plain summary for Slack incoming webhooks. |
| `ACCOUNT_DELETION_OPS_DIGEST_NOTIFY` | No | `action_or_warning` (**default**) — POST only if there is at least one **action_required** or **warning** row; skips webhook when **only informational** rows exist (unless `--force-webhook`). `always` — POST whenever `total > 0` and URL is set. `never` — never POST even if URL is set (stdout-only; useful when testing with URL present). |

## Signal quality (not log spam)

This digest summarizes **the view**, not application logs. It does **not** include **CLAIM_FAILED** (that is a **execute** script log signal — see **`ACCOUNT_DELETION_ALERTING.md`**). **Informational**-only digests do **not** trigger webhooks unless **`--force-webhook`** or **`ACCOUNT_DELETION_OPS_DIGEST_NOTIFY=always`**.

## Scheduling

**Manual (always valid):** Run locally — **`npm run digest:account-deletion`** (loads `.env.local` via the script entry).

**Optional — GitHub Actions:** Workflow **`.github/workflows/account-deletion-digest.yml`**

| Trigger | Behavior |
|---------|----------|
| **workflow_dispatch** | Run manually in **Actions** → **Account deletion ops digest** → **Run workflow**. |
| **schedule** | Weekly (Mondays **14:00 UTC**) — **remove the `schedule:` block** from the YAML file to disable cron without deleting the workflow. |

**Required repository secrets** (same names as env vars — no fake defaults):

| Secret | Purpose |
|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (read-only digest query). |

If either is **missing**, the workflow **exits successfully** with a **notice** — it does **not** fail CI or pretend delivery happened.

**Optional secrets** (webhook + bearer — same as local):

- `ACCOUNT_DELETION_OPS_WEBHOOK_URL`
- `ACCOUNT_DELETION_OPS_WEBHOOK_BEARER`

**Optional repository variables** (non-secret; same semantics as env):

- `ACCOUNT_DELETION_OPS_WEBHOOK_FORMAT`
- `ACCOUNT_DELETION_OPS_DIGEST_NOTIFY`

The workflow runs **`npm run digest:account-deletion:ci`** (tsx **without** `--env-file` — env comes only from GitHub). **Notify gating** is unchanged (`action_or_warning` / `always` / `never`).

**Forks:** Upstream secrets are not available; the job **skips** with the same notice — **no** surprise failures.

## Related docs

- **`ACCOUNT_DATA_CONTROLS.md`** — execute / ack-stale / reconcile  
- **`ACCOUNT_DELETION_ROUTINE_REVIEW.md`** — weekly habit  
- **`ACCOUNT_DELETION_ALERTING.md`** — log filters vs digest  
