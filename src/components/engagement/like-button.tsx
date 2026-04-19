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
    <div className="flex flex-wrap items-center gap-2">
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
        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          liked
            ? "bg-rose-900/50 text-rose-200 hover:bg-rose-900/70"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        }`}
      >
        {pending ? "…" : liked ? "♥ Liked" : "♡ Like"}
      </button>
      <span className="text-xs tabular-nums text-zinc-500">{likeCount}</span>
      {error ? (
        <span className="text-[10px] text-red-400" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
