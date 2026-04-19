/**
 * Canonical post_type values — must match Postgres enum `public.post_type`.
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

export const POST_TYPE_LABELS: Record<PostType, string> = {
  standard: "Standard post",
  mix_drop: "Mix drop",
  event_recap: "Event recap",
  transition_clip: "Transition clip",
  crate_post: "Crate post",
  now_playing: "Now playing",
  gear_setup: "Gear / setup",
};

export function labelForPostType(value: string): string {
  return POST_TYPE_LABELS[value as PostType] ?? value;
}
