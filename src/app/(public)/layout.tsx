import type { Metadata } from "next";
import Link from "next/link";

import { getPublicRouteRobots } from "@/lib/meta/indexing";
import { ROUTES } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: getPublicRouteRobots(),
  };
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="border-t border-[var(--border)] bg-zinc-50/80 px-4 py-6 text-center text-xs text-zinc-500">
        <nav className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href={ROUTES.terms} className="hover:text-zinc-800">
            Terms
          </Link>
          <Link href={ROUTES.privacy} className="hover:text-zinc-800">
            Privacy
          </Link>
          <Link href={ROUTES.contact} className="hover:text-zinc-800">
            Contact &amp; safety
          </Link>
        </nav>
        <p className="mt-3 text-[10px] text-zinc-400">
          Legal pages are draft placeholders — replace with counsel-approved copy before a public
          launch; do not treat them as binding.
        </p>
      </footer>
    </div>
  );
}
