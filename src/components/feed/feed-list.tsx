import type { FeedItem } from "@/lib/posts/queries";

import { PostCard } from "@/components/feed/post-card";

export function FeedList({
  items,
  currentProfileId,
}: {
  items: FeedItem[];
  currentProfileId: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 py-14 text-center">
        <p className="text-sm text-zinc-400">No posts yet.</p>
        <p className="mt-2 max-w-md mx-auto text-xs text-zinc-600">
          Share a mix drop, event recap, or gear setup — the feed shows real posts from the
          community, newest first.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-6">
      {items.map((item) => (
        <li key={item.post.id}>
          <PostCard
            item={item}
            isOwner={item.post.profile_id === currentProfileId}
            viewerProfileId={currentProfileId}
          />
        </li>
      ))}
    </ul>
  );
}
