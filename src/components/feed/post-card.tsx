import Image from "next/image";
import Link from "next/link";

import { PostEngagement } from "@/components/engagement/post-engagement";
import { PostCardMedia } from "@/components/feed/post-card-media";
import { DeletePostButton } from "@/components/posts/delete-post-button";
import { PostTrustBar } from "@/components/trust/post-trust-bar";
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
  /** First post on home feed: mark leading image for LCP (next/image). */
  priorityLeadingMedia = false,
}: {
  item: FeedItem;
  isOwner: boolean;
  viewerProfileId: string | null;
  priorityLeadingMedia?: boolean;
}) {
  const { post, author, media, engagement, comments } = item;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md shadow-zinc-200/40 ring-1 ring-zinc-100">
      {/* Identity strip */}
      <div className="flex gap-3 px-4 pb-3 pt-4">
        <Link
          href={profilePublicPath(author.handle)}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-1 ring-zinc-200 transition hover:ring-amber-400/80"
        >
          {author.avatar_url ? (
            <Image
              src={author.avatar_url}
              alt=""
              width={44}
              height={44}
              sizes="44px"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-600">
              {author.display_name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              href={profilePublicPath(author.handle)}
              className="truncate font-semibold text-zinc-900 hover:text-amber-900"
            >
              {author.display_name}
            </Link>
            <span className="shrink-0 text-xs text-zinc-500">@{author.handle}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              {labelForPostType(post.post_type)}
            </span>
            <span className="text-[11px] text-zinc-500">{formatTime(post.created_at)}</span>
          </div>
        </div>
        {isOwner ? (
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            <Link
              href={ROUTES.postEdit(post.id)}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              Edit
            </Link>
            <DeletePostButton postId={post.id} />
          </div>
        ) : null}
      </div>

      {!isOwner && viewerProfileId ? (
        <div className="px-4">
          <PostTrustBar
            postId={post.id}
            authorProfileId={author.profile_id}
            viewerProfileId={viewerProfileId}
          />
        </div>
      ) : null}

      {/* Media-first + optional viewer frame */}
      {media.length > 0 ? (
        <PostCardMedia
          media={media}
          authorMediaAspectRatio={post.media_aspect_ratio}
          priorityFirstImage={priorityLeadingMedia}
        />
      ) : null}

      <div className={`space-y-3 px-4 py-4 ${media.length === 0 ? "border-y border-zinc-100 bg-zinc-50/50" : ""}`}>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800">
          {post.caption}
        </p>
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
