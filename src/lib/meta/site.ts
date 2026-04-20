/**
 * Canonical site origin for metadata (Open Graph, canonical URLs).
 * Set `NEXT_PUBLIC_SITE_URL` in production (https://yourdomain.com).
 * On Vercel, `VERCEL_URL` is used as a fallback when the public URL env is unset.
 */
export function getSiteOrigin(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      const u = new URL(
        explicit.startsWith("http") ? explicit : `https://${explicit}`,
      );
      return u.origin;
    } catch {
      return undefined;
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return undefined;
}
