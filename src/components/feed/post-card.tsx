import Image from "next/image";
import Link from "next/link";

import { PostEngagement } from "@/components/engagement/post-engagement";
import { DeletePostButton } from "@/components/posts/delete-post-button";
import { labelForPostType } from "@/lib/posts/constants";
import type { FeedItem } from "@/lib/posts/queries";
import { profilePublicPath } from "@/lib/profile/paths";
import { ROUTES } from "@/lib/routes";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function PostCard({
  item,
  isOwner,
  viewerProfileId,
}: {
  item: FeedItem;
  isOwner: boolean;
  viewerProfileId: string;
}) {
  const { post, author, media, engagement, comments } = item;

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--border)] bg-zinc-950/50">
      <div className="flex gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800">
          {author.avatar_url ? (
            <Image
              src={author.avatar_url}
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500">
              {author.display_name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="truncate font-medium text-zinc-100">
              {author.display_name}
            </span>
            <Link
              href={profilePublicPath(author.handle)}
              className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300"
            >
              @{author.handle}
            </Link>
          </div>
          <p className="text-xs text-zinc-500">
            <span className="text-zinc-400">{labelForPostType(post.post_type)}</span>
            {" · "}
            {formatTime(post.created_at)}
          </p>
        </div>
        {isOwner ? (
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            <Link
              href={ROUTES.postEdit(post.id)}
              className="text-xs font-medium text-zinc-400 hover:text-white"
            >
              Edit
            </Link>
            <DeletePostButton postId={post.id} />
          </div>
        ) : null}
      </div>
      <div className="space-y-3 px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
          {post.caption}
        </p>
        {media.length > 0 ? (
          <ul className="space-y-3">
            {media.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-md border border-zinc-800 bg-black/40">
                {m.kind === "image" ? (
                  <div className="relative aspect-video w-full max-h-[480px]">
                    <Image
                      src={m.publicUrl}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 42rem"
                    />
                  </div>
                ) : (
                  <video
                    src={m.publicUrl}
                    controls
                    playsInline
                    className="max-h-[480px] w-full"
                    preload="metadata"
                  />
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <PostEngagement
        postId={post.id}
        engagement={engagement}
        comments={comments}
        viewerProfileId={viewerProfileId}
      />
    </article>
  );
}
