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
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh bg-white px-4 py-16 text-zinc-900 antialiased">
        <div className="mx-auto flex max-w-md flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold">Critical error</h1>
          <p className="text-sm text-zinc-600">
            The application failed to render. Try reloading the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mx-auto rounded-md border border-zinc-200 bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
