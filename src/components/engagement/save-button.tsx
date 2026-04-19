"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleSaveAction } from "@/actions/engagement";

/** Private bookmark — no public count (saves are not exposed to others). */
export function SaveButton({ postId, saved }: { postId: string; saved: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
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
              router.refresh();
            }
          });
        }}
        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          saved
            ? "bg-amber-900/40 text-amber-100 hover:bg-amber-900/60"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        }`}
      >
        {pending ? "…" : saved ? "Saved" : "Save"}
      </button>
      {error ? (
        <span className="text-[10px] text-red-400" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
