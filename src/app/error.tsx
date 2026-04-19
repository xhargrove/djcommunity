"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          An unexpected error occurred. You can try again or return home.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md border border-[var(--border)] bg-zinc-950 p-3 text-left text-xs text-zinc-400">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md border border-[var(--border)] bg-zinc-900 px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-zinc-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
