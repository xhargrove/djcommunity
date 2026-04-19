"use client";

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
    <html lang="en">
      <body className="min-h-dvh bg-[#0a0a0b] px-4 py-16 text-[#f4f4f5] antialiased">
        <div className="mx-auto flex max-w-md flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold">Critical error</h1>
          <p className="text-sm text-zinc-400">
            The application failed to render. Try reloading the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mx-auto rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
