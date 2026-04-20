"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleLikeAction } from "@/actions/engagement";

export function LikeButton({
  postId,
  likeCount,
  liked,
}: {
  postId: string;
  likeCount: number;
  liked: boolean;
}) {
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
            const r = await toggleLikeAction(postId);
            if (!r.ok) {
              setError(r.error);
            } else {
              router.refresh();
            }
          });
        }}
        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          liked
            ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        {pending ? "…" : liked ? "♥ Liked" : "♡ Like"}
      </button>
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] tabular-nums text-zinc-600">
        {likeCount}
      </span>
      {error ? (
        <span className="text-[10px] text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
