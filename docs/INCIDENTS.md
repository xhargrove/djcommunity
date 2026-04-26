# Incident response (concise)

For on-call or whoever has production access. Adjust contacts to your org.

## Abuse spike (spam, harassment, raids)

1. **Triage:** Identify surface (feed, rooms, DMs if any, sign-ups). Check logs filtered by `category` (`discovery`, `rooms`, `engagement`).
2. **Throttle:** Confirm **Upstash** is configured in production; if not, deploy env vars and redeploy (see `docs/OPERATIONS.md`).
3. **Moderation:** Use `/admin/moderation` for reports; escalate to owner for site-role changes if needed.
4. **Comms:** Post status to your internal channel; use placeholder abuse inbox until real `abuse@` is live.

## Redis / rate-limit degradation

1. **Symptom:** Structured warn `upstash_unavailable_using_memory_fallback` or elevated 429-like user errors.
2. **Check:** Upstash dashboard — outages, quota, wrong `UPSTASH_REDIS_REST_URL` / `TOKEN`.
3. **Mitigate:** Fix credentials; restart not always needed. Until fixed, limits are **per instance** only — scale horizontally with caution.
4. **Also see:** warn `production_using_in_memory_rate_limits_configure_upstash_for_multi_instance` when production runs **without** Upstash at all.

## Supabase auth / database outage

1. **Auth down:** Users cannot sign in; check [Supabase status](https://status.supabase.com/) and project health in dashboard.
2. **DB errors:** Search logs for `category":"database"`; check connection limits and slow queries.
3. **Restore:** Follow Supabase backup / PITR procedures; coordinate with whoever owns the project (see `docs/DATA_SAFETY.md`).

## Moderation escalation

1. **Serious illegal content:** Preserve report IDs; follow law enforcement process for your jurisdiction; do not destroy evidence blindly.
2. **Staff access:** Owners use `/admin/team`; moderators use moderation queue only.

## Backup / restore coordination

1. **Before destructive fixes:** Confirm latest backup or PITR point.
2. **After restore:** Invalidate caches if any; re-run migrations if schema was partially applied (avoid double-apply — use migration discipline).

## Account deletion operations

**When:** Script failures, stuck tickets, or reports that accounts were not fully removed.

| Signal | Severity | First action |
|--------|----------|--------------|
| Log `code=FINALIZE` or view row `finalize_reconcile_candidate` | **Action required** | `docs/ACCOUNT_DATA_CONTROLS.md` → reconcile script after verifying Auth/profile gone. |
| `execution_status=failed` (other codes) | **Action required** | Fix cause (e.g. storage), re-run `npm run execute:account-deletion`. |
| `stuck_running` in `v_account_deletion_open_ops` or logs | **Warning** | Confirm no active process → `--ack-stale-run`, then retry or reconcile. |
| `CLAIM_FAILED` once | **Informational** | Retry; two operators may have collided. |
| `old_pending` / `processing_idle_stale` in view | **Warning / informational** | Often people/process, not infra — triage in `/admin/account-deletion`. |

**Where to look:** Structured logs (`docs/ACCOUNT_DELETION_ALERTING.md`), SQL view `v_account_deletion_open_ops`, weekly **`docs/ACCOUNT_DELETION_ROUTINE_REVIEW.md`**. Optional **`docs/ACCOUNT_DELETION_OPS_DIGEST.md`** (`npm run digest:account-deletion` or scheduled **`account-deletion-digest.yml`**) — **no default webhook**; GitHub workflow **skips** if Supabase secrets are missing (see digest doc).

Keep this doc short; link out to Supabase and hosting runbooks as your stack solidifies.
