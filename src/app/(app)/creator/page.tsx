import Link from "next/link";

import { AppPageHeader } from "@/components/shell/app-page-header";
import { ROUTES } from "@/lib/routes";

export default function CreatorRoadmapPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-10 pb-8">
      <AppPageHeader
        eyebrow="DJ Community Network"
        title="Creator roadmap"
        subtitle="Nothing here is for sale yet. These are the directions we’re building toward—aligned with real DJ culture, not generic creator tools."
      />

      <section className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 ring-1 ring-amber-100">
        <p className="text-sm leading-relaxed text-amber-950/90">
          Billing and entitlements are not live. When we ship paid surfaces, they’ll show up
          here and in settings with clear pricing—not hidden toggles.
        </p>
      </section>

      <ul className="space-y-4 text-sm text-zinc-700">
        <li className="rounded-2xl border border-zinc-200 bg-white p-4 ring-1 ring-zinc-100">
          <h2 className="font-semibold text-zinc-900">DJCN Pro / Studio</h2>
          <p className="mt-2 leading-relaxed text-zinc-600">
            Deeper profile tools, mix showcases, and booking-forward layouts for working DJs.
          </p>
        </li>
        <li className="rounded-2xl border border-zinc-200 bg-white p-4 ring-1 ring-zinc-100">
          <h2 className="font-semibold text-zinc-900">Discovery &amp; placement</h2>
          <p className="mt-2 leading-relaxed text-zinc-600">
            Optional boosts for posts, rooms, or city scenes—always labeled, never disguised as
            organic reach.
          </p>
        </li>
        <li className="rounded-2xl border border-zinc-200 bg-white p-4 ring-1 ring-zinc-100">
          <h2 className="font-semibold text-zinc-900">Rooms &amp; community</h2>
          <p className="mt-2 leading-relaxed text-zinc-600">
            Premium room tools for crews and promoters (moderation, pins, event threads)—built
            for real chat, not generic groups.
          </p>
        </li>
        <li className="rounded-2xl border border-zinc-200 bg-white p-4 ring-1 ring-zinc-100">
          <h2 className="font-semibold text-zinc-900">Events &amp; promotion</h2>
          <p className="mt-2 leading-relaxed text-zinc-600">
            Promoted listings for gigs, takeovers, and tours, tied to cities and genres you
            already use in the app.
          </p>
        </li>
      </ul>

      <p className="text-center text-xs text-zinc-500">
        <Link href={ROUTES.home} className="font-medium text-amber-800 hover:underline">
          Back to Home
        </Link>
      </p>
    </div>
  );
}
