/**
 * Profile UI helpers. Canonical genres, DJ types, and cities live in Postgres
 * (`genres`, `dj_types`, `cities`) — load via `@/lib/taxonomy/queries`.
 */

/** Fallback display when a slug is shown without a DB label (should be rare). */
export function formatSlugLabel(slug: string): string {
  return slug.replace(/_/g, " ");
}
