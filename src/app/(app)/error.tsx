"use client";

import Link from "next/link";

import { ROUTES } from "@/lib/routes";

/**
 * Error boundary for the signed-in app shell — keeps failures from blanking the whole tree.
 */
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-xl flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-zinc-900">This view couldn&apos;t load</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Something went wrong in the app. You can retry or go back to Home.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <pre className="mt-4 max-h-32 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-left text-xs text-zinc-600">
            {error.message}
          </pre>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Try again
        </button>
        <Link
          href={ROUTES.home}
          className="rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
