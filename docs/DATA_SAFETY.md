# Data safety & lifecycle (DJ Community Network)

Honest operational expectations — not legal or compliance certification.

## Database & Supabase

- **Source of truth:** Postgres via Supabase. Access from the app uses the **anon key** + RLS for normal users; **service role** is reserved for trusted server paths (e.g. staff role changes) and must never ship to the browser.
- **Backups:** Rely on **Supabase project backup / PITR** settings for your plan. Document your RPO/RTO targets with whoever owns infrastructure. Application code does not replace project-level backups.
- **Migrations:** Apply `supabase/migrations/` in order on each environment; avoid ad-hoc schema drift.

## Retention & lifecycle (policy clarity)

| Area | Current assumption |
|------|-------------------|
| **Posts & media** | Stored until user or staff deletion flows run; storage objects should be removed when posts are deleted (see app storage helpers). No automatic TTL in app code unless you add jobs. |
| **Room messages** | Persist for chat history unless you add retention jobs or user delete rules later. |
| **Content reports** | Rows in `content_reports` / triage are operational records for moderation; define internally how long to keep closed reports and whether to anonymize. |
| **Notifications** | Typically short-lived UX state; confirm whether you prune read rows on a schedule. |
| **Profiles** | Tied to auth users; deletion/account closure is documented in **`docs/ACCOUNT_DATA_CONTROLS.md`** with operator scripts, reconciliation, and **`docs/ACCOUNT_DELETION_ROUTINE_REVIEW.md`** for routine review. |

## RLS & audits

- **Recurring review:** When adding tables or policies, re-check: staff-only tables (`content_report_triage`, site roles), room membership rules, and feed queries that must respect blocks.
- **Operational access:** Supabase dashboard SQL bypasses RLS — restrict project access to trusted operators.

## What this doc is not

- Not a GDPR/CCPA compliance statement (see placeholder Privacy page for product-facing notice).
- Not a substitute for backup drills or incident response runbooks.
