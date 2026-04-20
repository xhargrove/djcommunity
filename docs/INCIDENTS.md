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

Keep this doc short; link out to Supabase and hosting runbooks as your stack solidifies.
