import type { Metadata } from "next";
import Link from "next/link";

import { DraftLegalBanner } from "@/components/legal/draft-legal-banner";
import { getSiteOrigin } from "@/lib/meta/site";
import { ROUTES } from "@/lib/routes";

const description =
  "Placeholder terms of service — not a binding agreement. Replace with counsel-reviewed copy before launch.";

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteOrigin();
  const canonical = site ? `${site}${ROUTES.terms}` : undefined;
  return {
    title: "Terms of Service · DJ Community Network",
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: "Terms of Service · DJ Community Network",
      description,
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: "Terms of Service · DJ Community Network",
      description,
    },
  };
}

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <DraftLegalBanner />
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Terms of Service (placeholder)
      </h1>
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        This page is a <strong className="font-medium text-zinc-700">non-final placeholder</strong>.
        It does not constitute legal advice or a binding agreement. Before public launch, replace
        this content with terms reviewed by qualified counsel for your jurisdiction(s) and
        business model.
      </p>
      <ul className="list-inside list-disc space-y-2 text-sm text-zinc-600">
        <li>Expected topics: acceptable use, account termination, content license grants, limitation of liability, governing law.</li>
        <li>DJ Community Network may update terms with notice as described in the final document.</li>
      </ul>
      <p className="text-center text-xs text-zinc-500">
        <Link href={ROUTES.root} className="font-medium text-amber-800 hover:underline">
          Back to landing
        </Link>
      </p>
    </div>
  );
}
