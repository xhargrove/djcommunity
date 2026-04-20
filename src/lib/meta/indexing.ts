import type { Metadata } from "next";

/**
 * Environment-aware search indexing policy (robots meta + robots.txt + sitemap gating).
 *
 * Rules (conservative):
 * - Never index outside production runtime (`NODE_ENV === "production"`).
 * - On Vercel: only `VERCEL_ENV=production` may index; preview + Vercel `development` do not.
 * - Non-Vercel production hosts must opt in with `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true`.
 * - Kill switches: `NEXT_PUBLIC_INDEXING_DISABLED=true` or `NEXT_PUBLIC_SITE_INDEXING=off`.
 *
 * This does not replace auth/RLS — it reduces accidental SERP leakage for staging and previews.
 */
export function shouldAllowSearchIndexing(): boolean {
  if (process.env.NEXT_PUBLIC_INDEXING_DISABLED === "true") return false;
  if (process.env.NEXT_PUBLIC_SITE_INDEXING === "off") return false;

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "preview" || vercelEnv === "development") return false;

  if (process.env.NODE_ENV !== "production") return false;

  if (vercelEnv === "production") return true;

  return process.env.NEXT_PUBLIC_ALLOW_SEARCH_INDEXING === "true";
}

/** Robots metadata for intentionally public marketing/legal/profile routes. */
export function getPublicRouteRobots(): Metadata["robots"] {
  if (!shouldAllowSearchIndexing()) {
    return {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    };
  }
  return { index: true, follow: true };
}

/** Robots metadata for authenticated, staff, or auth surfaces — never indexed. */
export function getPrivateRouteRobots(): Metadata["robots"] {
  return {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  };
}

/** Default for the root layout before segment-specific overrides. */
export function getDefaultRootRobots(): Metadata["robots"] {
  return getPrivateRouteRobots();
}
