"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleSaveAction } from "@/actions/engagement";
import { PRODUCT_EVENTS } from "@/lib/analytics/events";
import { trackProductEvent } from "@/lib/analytics/track-client";

/** Private bookmark — no public count (saves are not exposed to others). */
export function SaveButton({ postId, saved }: { postId: string; saved: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await toggleSaveAction(postId);
            if (!r.ok) {
              setError(r.error);
            } else {
              trackProductEvent(PRODUCT_EVENTS.POST_SAVE_TOGGLED, {
                post_id: postId,
                saved_after: String(!saved),
              });
              router.refresh();
            }
          });
        }}
        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          saved
            ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        {pending ? "…" : saved ? "Saved" : "Save"}
      </button>
      {error ? (
        <span className="text-[10px] text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
