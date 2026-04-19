export default function AppLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-800" />
      <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-zinc-800" />
      <div className="h-4 w-full max-w-sm animate-pulse rounded-md bg-zinc-800" />
    </div>
  );
}
