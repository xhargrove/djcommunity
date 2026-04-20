import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-14 text-center ring-1 ring-zinc-100">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-5 flex justify-center">{children}</div> : null}
    </div>
  );
}
