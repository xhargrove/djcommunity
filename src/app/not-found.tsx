import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Page not found
      </h1>
      <p className="text-center text-sm text-[var(--muted)]">
        The page you requested does not exist.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-amber-700 underline underline-offset-4 hover:text-amber-900"
      >
        Back home
      </Link>
    </div>
  );
}
