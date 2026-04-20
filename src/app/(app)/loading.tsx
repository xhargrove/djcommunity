export default function AppLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-6 px-0 pt-2"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded-md bg-zinc-200" />
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-3 w-full max-w-md animate-pulse rounded-md bg-zinc-100" />
      </div>
      <div className="space-y-4 pt-4">
        <div className="h-64 w-full animate-pulse rounded-2xl bg-gradient-to-b from-zinc-100 to-zinc-50 sm:h-72" />
        <div className="h-36 w-full animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    </div>
  );
}
