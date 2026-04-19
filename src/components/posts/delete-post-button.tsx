"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deletePostAction } from "@/actions/posts";

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="text-right">
      {error ? (
        <p className="mb-1 max-w-[12rem] text-right text-[10px] text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await deletePostAction(postId);
            if (!r.ok) {
              setError(r.error);
            } else {
              router.refresh();
            }
          });
        }}
        className="text-xs text-red-400/90 hover:text-red-300 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
