/**
 * Normalize user input into a URL slug. Must satisfy DB CHECK on `rooms.slug`.
 */
export function normalizeRoomSlug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s;
}

export function isValidRoomSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 64) {
    return false;
  }
  return /^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$/.test(slug);
}
