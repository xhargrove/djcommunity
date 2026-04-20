import type { MetadataRoute } from "next";

import { shouldAllowSearchIndexing } from "@/lib/meta/indexing";
import { getSiteOrigin } from "@/lib/meta/site";

/**
 * Crawl hints only — pair with `robots` metadata on routes. When indexing is off,
 * disallow everything so staging/preview URLs are less likely to be crawled.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  if (!shouldAllowSearchIndexing()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  const disallow: string[] = [
    "/home",
    "/onboarding",
    "/explore",
    "/create",
    "/rooms",
    "/notifications",
    "/admin",
    "/creator",
    "/profile",
    "/posts",
    "/login",
    "/sign-up",
    "/settings",
  ];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: origin ? `${origin}/sitemap.xml` : undefined,
  };
}
