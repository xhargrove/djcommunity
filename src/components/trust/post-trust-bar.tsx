"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { blockProfileAction } from "@/actions/trust";

import { InlineReportControl } from "./inline-report";

export function PostTrustBar({
  postId,
  authorProfileId,
  viewerProfileId,
}: {
  postId: string;
  authorProfileId: string;
  viewerProfileId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (authorProfileId === viewerProfileId) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1 pb-1">
      <InlineReportControl targetKind="post" targetId={postId} />
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              "Block this account? You will not see their posts or comments in your feed.",
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const r = await blockProfileAction(authorProfileId);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            router.refresh();
          });
        }}
        className="text-[10px] font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-50"
      >
        {pending ? "…" : "Block author"}
      </button>
      {error ? (
        <p className="w-full text-[10px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
