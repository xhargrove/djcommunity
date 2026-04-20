import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

import { getPublicEnv } from "@/lib/env/public";
import { getDefaultRootRobots } from "@/lib/meta/indexing";
import { getSiteOrigin } from "@/lib/meta/site";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
});

const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  ...(siteOrigin ? { metadataBase: new URL(siteOrigin) } : {}),
  title: {
    default: "DJ Community Network",
    template: "%s · DJ Community Network",
  },
  description:
    "A network for DJs — profiles, feeds, rooms, and local discovery.",
  openGraph: {
    type: "website",
    siteName: "DJ Community Network",
    title: "DJ Community Network",
    description:
      "A network for DJs — profiles, feeds, rooms, and local discovery.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DJ Community Network",
  },
  robots: getDefaultRootRobots(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  getPublicEnv();

  return (
    <html lang="en">
      <body
        className={`min-h-dvh bg-[var(--background)] antialiased ${geistSans.className}`}
      >
        {children}
      </body>
    </html>
  );
}
