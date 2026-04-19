export default function AuthLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div
        className="h-48 w-full max-w-sm animate-pulse rounded-xl border border-[var(--border)] bg-zinc-900/40"
        aria-busy="true"
        aria-label="Loading"
      />
    </div>
  );
}
