"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteCommentAction } from "@/actions/engagement";
import { InlineReportControl } from "@/components/trust/inline-report";
import type { FeedComment } from "@/lib/posts/queries";
import { profilePublicPath } from "@/lib/profile/paths";

function formatCommentTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function DeleteCommentControl({
  commentId,
  canDelete,
}: {
  commentId: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canDelete) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      {error ? (
        <span className="text-[10px] text-red-600">{error}</span>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await deleteCommentAction(commentId);
            if (!r.ok) {
              setError(r.error);
            } else {
              router.refresh();
            }
          });
        }}
        className="text-[10px] text-zinc-500 hover:text-red-600 disabled:opacity-50"
      >
        {pending ? "…" : "Delete"}
      </button>
    </div>
  );
}

export function CommentThread({
  comments,
  viewerProfileId,
}: {
  comments: FeedComment[];
  viewerProfileId: string | null;
}) {
  if (comments.length === 0) {
    return (
      <p className="text-[11px] text-zinc-600">No comments yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {comments.map((c) => (
        <li
          key={c.id}
          className="flex gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-2.5 shadow-sm"
        >
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-zinc-200">
            {c.author.avatar_url ? (
              <Image
                src={c.author.avatar_url}
                alt=""
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                {c.author.display_name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-xs font-medium text-zinc-900">
                {c.author.display_name}
              </span>
              <Link
                href={profilePublicPath(c.author.handle)}
                className="text-[10px] text-zinc-500 hover:text-zinc-800"
              >
                @{c.author.handle}
              </Link>
              <span className="text-[10px] text-zinc-600">
                {formatCommentTime(c.created_at)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-700">
              {c.body}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {viewerProfileId !== null &&
            c.author.profile_id !== viewerProfileId ? (
              <InlineReportControl
                targetKind="post_comment"
                targetId={c.id}
              />
            ) : null}
            <DeleteCommentControl
              commentId={c.id}
              canDelete={
                viewerProfileId !== null &&
                c.author.profile_id === viewerProfileId
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
