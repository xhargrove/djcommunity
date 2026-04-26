import type { Metadata } from "next";
import Link from "next/link";

import { getSiteOrigin } from "@/lib/meta/site";
import { ROUTES } from "@/lib/routes";

const defaultDescription =
  "A network for DJs — profiles, feeds, rooms, and local discovery.";

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteOrigin();
  const canonical = site ? `${site}${ROUTES.root}` : undefined;
  return {
    title: "MixerHQ",
    description: defaultDescription,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: "website",
      title: "MixerHQ",
      description: defaultDescription,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: "MixerHQ",
      description: defaultDescription,
    },
  };
}

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          MixerHQ
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Sign in to continue. New accounts can register from the sign-up page.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={ROUTES.login}
          className="rounded-md bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Log in
        </Link>
        <Link
          href={ROUTES.signUp}
          className="rounded-md border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
