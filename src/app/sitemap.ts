import type { MetadataRoute } from "next";

import { shouldAllowSearchIndexing } from "@/lib/meta/indexing";
import { getSiteOrigin } from "@/lib/meta/site";
import { ROUTES } from "@/lib/routes";

/**
 * Static public URLs only. Profile URLs (`/u/:handle`) can be added later by querying
 * public profiles — omitted until that pipeline is intentional.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteOrigin();
  if (!base || !shouldAllowSearchIndexing()) {
    return [];
  }

  const lastModified = new Date();
  const origin = base.replace(/\/$/, "");

  return [
    { url: `${origin}${ROUTES.root}`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}${ROUTES.terms}`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}${ROUTES.privacy}`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}${ROUTES.contact}`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
