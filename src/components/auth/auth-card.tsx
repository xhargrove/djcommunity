export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border border-[var(--border)] bg-zinc-950/50 p-6 shadow-xl backdrop-blur">
      <div className="mb-6 space-y-1">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
