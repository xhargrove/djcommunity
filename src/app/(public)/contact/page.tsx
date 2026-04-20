import type { Metadata } from "next";
import Link from "next/link";

import { DraftLegalBanner } from "@/components/legal/draft-legal-banner";
import { getSiteOrigin } from "@/lib/meta/site";
import { ROUTES } from "@/lib/routes";

const description =
  "Contact and safety entry points — configure support and abuse inboxes via environment variables.";

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteOrigin();
  const canonical = site ? `${site}${ROUTES.contact}` : undefined;
  return {
    title: "Contact & safety · DJ Community Network",
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: "Contact & safety · DJ Community Network",
      description,
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: "Contact & safety · DJ Community Network",
      description,
    },
  };
}

function contactMailto(email: string, subject: string): string {
  const q = new URLSearchParams({ subject });
  return `mailto:${email}?${q.toString()}`;
}

export default function ContactPage() {
  const support = process.env.NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL?.trim();
  const abuse = process.env.NEXT_PUBLIC_ABUSE_CONTACT_EMAIL?.trim();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <DraftLegalBanner />
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Contact &amp; safety
      </h1>
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Before public launch, set real inboxes via{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL</code>{" "}
        and{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">NEXT_PUBLIC_ABUSE_CONTACT_EMAIL</code>.
        Until then, this page shows that those channels are not configured — not fake production
        addresses.
      </p>
      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
        <h2 className="font-semibold text-zinc-900">General support</h2>
        {support ? (
          <p className="mt-2">
            <a
              href={contactMailto(support, "DJ Community Network — support")}
              className="font-medium text-amber-800 underline-offset-2 hover:underline"
            >
              {support}
            </a>
          </p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            Not configured — set NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL for this deployment.
          </p>
        )}
      </section>
      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Abuse, safety, and moderation</h2>
        {abuse ? (
          <>
            <p className="mt-2">
              For harassment, spam, illegal content, or other safety concerns (including appeals):{" "}
              <a
                href={contactMailto(abuse, "DJ Community Network — safety / abuse")}
                className="font-medium text-amber-800 underline-offset-2 hover:underline"
              >
                {abuse}
              </a>
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Users can also report content in-app; staff review is documented in operations materials.
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            Not configured — set NEXT_PUBLIC_ABUSE_CONTACT_EMAIL for this deployment.
          </p>
        )}
      </section>
      <p className="text-center text-xs text-zinc-500">
        <Link href={ROUTES.root} className="font-medium text-amber-800 hover:underline">
          Back to landing
        </Link>
      </p>
    </div>
  );
}
