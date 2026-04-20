import Link from "next/link";

import type { FeedItem } from "@/lib/posts/queries";

import { PostCard } from "@/components/feed/post-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ROUTES } from "@/lib/routes";

export function FeedList({
  items,
  currentProfileId,
}: {
  items: FeedItem[];
  /** Viewer profile id for engagement; null when logged out */
  currentProfileId: string | null;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Your feed is quiet"
        description="Follow DJs in Explore, join a city or crew Room, or post something—the Home feed only shows people you follow (and isn’t algorithmically stuffed)."
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={ROUTES.explore}
            className="inline-flex min-h-11 min-w-[7rem] items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Explore DJs
          </Link>
          <Link
            href={ROUTES.rooms}
            className="inline-flex min-h-11 min-w-[7rem] items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Browse rooms
          </Link>
          <Link
            href={ROUTES.create}
            className="inline-flex min-h-11 min-w-[7rem] items-center justify-center rounded-full bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700"
          >
            Create post
          </Link>
        </div>
      </EmptyState>
    );
  }

  return (
    <ul className="flex flex-col gap-7">
      {items.map((item, index) => (
        <li key={item.post.id}>
          <PostCard
            item={item}
            isOwner={
              currentProfileId !== null &&
              item.post.profile_id === currentProfileId
            }
            viewerProfileId={currentProfileId}
            priorityLeadingMedia={index === 0}
          />
        </li>
      ))}
    </ul>
  );
}
