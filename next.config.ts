import path from "path";
import { fileURLToPath } from "url";

import type { NextConfig } from "next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let supabaseHost: string | undefined;
try {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (u) {
    supabaseHost = new URL(u).hostname;
  }
} catch {
  supabaseHost = undefined;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  /** Dev / Playwright: allow browser origin when hitting the dev server on 127.0.0.1. */
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      { source: "/discover", destination: "/explore", permanent: true },
      { source: "/discover/:path*", destination: "/explore/:path*", permanent: true },
      // Browsers default to /favicon.ico; serve the SVG icon without duplicating binary ICO.
      { source: "/favicon.ico", destination: "/icon.svg", permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      // Create post allows video up to 50MB; default Next limit is 1MB.
      bodySizeLimit: "55mb",
    },
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
