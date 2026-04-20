"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { blockProfileAction, unblockProfileAction } from "@/actions/trust";

import { InlineReportControl } from "./inline-report";

export function ProfileTrustSection({
  targetProfileId,
  viewerProfileId,
  initiallyBlocked,
}: {
  targetProfileId: string;
  viewerProfileId: string;
  initiallyBlocked: boolean;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setBlocked(initiallyBlocked);
  }, [initiallyBlocked]);

  if (targetProfileId === viewerProfileId) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Safety
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
        Community standards apply across DJCN. You can block accounts or report profiles that
        break the rules—reports are reviewed by the platform team.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-2">
        <InlineReportControl targetKind="profile" targetId={targetProfileId} />
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = blocked
                ? await unblockProfileAction(targetProfileId)
                : await blockProfileAction(targetProfileId);
              if (!r.ok) {
                setError(r.error);
                return;
              }
              setBlocked(!blocked);
              router.refresh();
            });
          }}
          className="text-[11px] font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950 disabled:opacity-50"
        >
          {pending ? "…" : blocked ? "Unblock account" : "Block account"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
