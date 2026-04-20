# Maintenance scripts

- **`docs/DATA_HYGIENE.md`** — example SQL for optional cleanup (notifications, etc.).
- **No cron in-repo** — avoids silent destructive jobs. Add scheduler jobs in your platform only after policy approval.

To run SQL: Supabase SQL editor or `psql` with a role that respects your change management process.
