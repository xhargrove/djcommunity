import type { Metadata } from "next";
import Link from "next/link";

import { DraftLegalBanner } from "@/components/legal/draft-legal-banner";
import { getSiteOrigin } from "@/lib/meta/site";
import { ROUTES } from "@/lib/routes";

const description =
  "Placeholder privacy notice — incomplete and non-binding. A real policy must match actual data practices.";

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteOrigin();
  const canonical = site ? `${site}${ROUTES.privacy}` : undefined;
  return {
    title: "Privacy Policy · MixerHQ",
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: "Privacy Policy · MixerHQ",
      description,
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: "Privacy Policy · MixerHQ",
      description,
    },
  };
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <DraftLegalBanner />
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Privacy Policy (placeholder)
      </h1>
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        This page is a <strong className="font-medium text-zinc-700">non-final placeholder</strong>.
        It is not a complete privacy notice. Before collecting personal data from the public,
        publish a policy that matches your real practices; counsel typically addresses topics
        such as collection, retention, subprocessors (e.g. Supabase), and regional rights —
        this file does not assert compliance with any specific law.
      </p>
      <ul className="list-inside list-disc space-y-2 text-sm text-zinc-600">
        <li>Expected topics: what you collect, why, retention, subprocessors (e.g. Supabase), user rights, contact for privacy requests.</li>
        <li>Analytics: optional GA4 events are documented in code; disable or configure before launch as needed.</li>
      </ul>
      <p className="text-center text-xs text-zinc-500">
        <Link href={ROUTES.root} className="font-medium text-amber-800 hover:underline">
          Back to landing
        </Link>
      </p>
    </div>
  );
}
