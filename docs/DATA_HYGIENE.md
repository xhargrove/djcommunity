# Data hygiene (opt-in maintenance)

Nothing here runs automatically in the app. Operators run SQL against Supabase **manually** after review. Adjust time windows and batch sizes for your scale.

## Old read notifications

**Assumption:** Read notifications older than N days are low value for UX; unread rows are never deleted by these examples.

Review counts first:

```sql
select count(*) from notifications
where read_at is not null
  and read_at < now() - interval '90 days';
```

**Example delete (dry-run with a transaction rollback first in a session):**

```sql
-- delete read notifications older than 90 days (example only)
delete from notifications
where read_at is not null
  and read_at < now() - interval '90 days';
```

## Closed / stale moderation reports

**Assumption:** You may want to archive or delete very old `content_reports` with status `dismissed` or `reviewed` after legal/ops sign-off. **Do not** delete rows you need for audit without policy approval.

Example count:

```sql
select status, count(*) from content_reports group by 1;
```

Any destructive policy belongs in a migration or a documented one-off with backups.

## Ephemeral data

- **Rate-limit keys** live in Upstash when configured; no DB growth from the app limiter.
- **Session/auth** — managed by Supabase Auth; retention follows Supabase project settings.

## Before you run deletes

1. **Backup** or confirm Supabase PITR window is acceptable.
2. Run **`select`** counts and spot-check IDs.
3. Prefer **off-peak** windows and **small batches** (`limit` + loop) for huge tables.

See also: `docs/DATA_SAFETY.md`.
