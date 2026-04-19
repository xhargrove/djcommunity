import Link from "next/link";

import { ROUTES } from "@/lib/routes";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          DJ Community Network
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Sign in to continue. New accounts can register from the sign-up page.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={ROUTES.login}
          className="rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white"
        >
          Log in
        </Link>
        <Link
          href={ROUTES.signUp}
          className="rounded-md border border-[var(--border)] bg-zinc-900 px-5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-zinc-800"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
