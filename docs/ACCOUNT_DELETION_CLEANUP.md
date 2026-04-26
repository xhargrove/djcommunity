# Account deletion — what cleans up automatically

This document maps **application tables and storage** to how they behave when the operator script deletes the **Auth user** (`auth.admin.deleteUser`) after removing known storage objects. It is an audit for operators, not a compliance certification.

## Chain from Auth user delete

`public.profiles.user_id` references `auth.users(id)` **ON DELETE CASCADE**. Deleting the Auth user deletes the **profile row**, which in turn cascades to every table that references `profiles.id` with **ON DELETE CASCADE** in this repo’s migrations.

## Handled by FK cascade (no extra script SQL)

| Area | Table(s) | Notes |
|------|-----------|--------|
| Profile | `profiles` | Removed with Auth user. |
| Posts / feed | `posts`, `post_media` (rows), `post_saves`, `post_likes`, `post_comments`, … | Per `profiles` CASCADE from Phase 2–3 migrations. |
| Social | `follows`, engagement tables tied to `profile_id` | CASCADE on profile. |
| Rooms | `rooms`, `room_memberships`, `room_messages` | CASCADE on profile where defined. |
| Notifications | `notifications` | CASCADE on profile. |
| Trust / moderation | `profile_blocks`, `content_reports` (reporter), etc. | CASCADE where `profile_id` FK uses CASCADE. |

**Operator script** deletes **storage** objects in `post_media`, `avatars`, and `banners` buckets **before** Auth delete so blobs are not orphaned if DB rows disappear first in other workflows.

## Not cascaded from Auth alone (still covered indirectly)

- **`account_deletion_requests`:** `user_id` / `profile_id` use **ON DELETE SET NULL** (retention migration). The ticket row **remains** as audit; IDs are nulled when Auth/profile is removed.
- **Staff-only references** (e.g. `reviewed_by_profile_id`): typically **SET NULL** — ticket stays, reviewer pointer may clear if that profile is deleted elsewhere.

## Manual / runbook-only

- **Supabase Auth** identities outside this app’s flows (e.g. created only in Dashboard) — same script deletes by `user_id` when present.
- **External systems** (email provider, analytics, billing): **not** in scope; document separately if integrated later.
- **Storage paths** not under the conventions the script removes (custom paths, other buckets): manual cleanup if any existed.

## When to add explicit SQL

Add targeted deletes or RPC **only** if a future migration introduces:

- `profile_id` / `user_id` FKs with **RESTRICT** or **SET DEFAULT** that block Auth delete, or  
- Tables that reference users **without** going through `profiles` in a way that blocks deletion.

Until then, the current model is: **storage script + Auth admin deleteUser + retained ticket row**.
