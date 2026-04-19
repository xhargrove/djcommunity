/**
 * Normalize user input for handle (lowercase, trim).
 * Does not guarantee DB validity — use `isValidHandleFormat` after.
 */
export function normalizeHandleInput(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Matches database CHECK on `profiles.handle`. */
export function isValidHandleFormat(handle: string): boolean {
  if (handle.length < 3 || handle.length > 30) {
    return false;
  }
  return (
    /^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/.test(handle) ||
    /^[a-z0-9]{3}$/.test(handle)
  );
}
