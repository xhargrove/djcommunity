/**
 * Post type capability contract (single source of truth for domain rules).
 *
 * **POST_TYPES** — Every value persisted in Postgres `public.post_type` and supported for
 * display (`labelForPostType`), feed rendering, and typing. Must stay aligned with the DB enum.
 *
 * **POST_TYPES_CREATABLE** — Subset allowed when *creating* a new post (composer + create schema).
 * Legacy types (`mix_drop`, `transition_clip`) remain in POST_TYPES for historical rows but are
 * not offered for new posts.
 *
 * **POST_TYPES_EDITABLE** — Subset allowed when *updating* an existing post (edit form + update
 * schema). Today this is intentionally **all** POST_TYPES so moderators/authors can change type
 * among every persisted value, including legacy types still stored on rows.
 *
 * When adding a new enum value: (1) add a migration for `public.post_type`, (2) extend POST_TYPES
 * and POST_TYPE_LABELS, (3) decide creatable vs legacy-only, (4) adjust POST_TYPES_CREATABLE /
 * POST_TYPES_EDITABLE if the new value has different rules.
 */

export const POST_TYPES = [
  "standard",
  "mix_drop",
  "event_recap",
  "transition_clip",
  "crate_post",
  "now_playing",
  "gear_setup",
] as const;

export type PostType = (typeof POST_TYPES)[number];

/** New posts: composer options + `createPostSchema` — server-enforced, not UI-only. */
export const POST_TYPES_CREATABLE = [
  "standard",
  "event_recap",
  "crate_post",
  "now_playing",
  "gear_setup",
] as const satisfies readonly PostType[];

export type CreatablePostType = (typeof POST_TYPES_CREATABLE)[number];

/**
 * Post edits: edit dropdown + `updatePostSchema`.
 * Full enum so legacy-stored types remain selectable and swappable.
 */
export const POST_TYPES_EDITABLE = POST_TYPES;

export type EditablePostType = (typeof POST_TYPES_EDITABLE)[number];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  standard: "Standard post",
  mix_drop: "Mix drop",
  event_recap: "Event recap",
  transition_clip: "Transition clip",
  crate_post: "Crate post",
  now_playing: "Now playing",
  gear_setup: "Gear / setup",
};

const CREATABLE_SET = new Set<string>(POST_TYPES_CREATABLE);
const EDITABLE_SET = new Set<string>(POST_TYPES_EDITABLE);

export function isCreatablePostType(value: string): value is CreatablePostType {
  return CREATABLE_SET.has(value);
}

export function isEditablePostType(value: string): value is EditablePostType {
  return EDITABLE_SET.has(value);
}

export function labelForPostType(value: string): string {
  return POST_TYPE_LABELS[value as PostType] ?? value;
}

/** Instagram-style multi-photo/video per post (composer + server action). */
export const POST_CAROUSEL_MAX_MEDIA = 10;

/** Per image in a feed post (carousel) — must match `createPostAction` validation. */
export const MAX_POST_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Per video in a feed post. We cap **file size**, not duration in software—this budget
 * is sized so typical phone **1080p** clips of **~2–3 minutes** usually fit; very high
 * bitrates (e.g. 4K) may still need a shorter clip or re-export.
 */
export const MAX_POST_VIDEO_BYTES = 350 * 1024 * 1024;
