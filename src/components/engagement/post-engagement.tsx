import type { FeedComment, PostEngagementState } from "@/lib/posts/queries";

import { CommentForm } from "@/components/engagement/comment-form";
import { CommentThread } from "@/components/engagement/comment-thread";
import { LikeButton } from "@/components/engagement/like-button";
import { SaveButton } from "@/components/engagement/save-button";

export function PostEngagement({
  postId,
  engagement,
  comments,
  viewerProfileId,
}: {
  postId: string;
  engagement: PostEngagementState;
  comments: FeedComment[];
  viewerProfileId: string | null;
}) {
  return (
    <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/80 px-4 py-3">
      <div className="text-[11px] text-zinc-600">
        <span className="font-medium text-zinc-900">{engagement.likeCount}</span>{" "}
        likes
        <span className="mx-2 text-zinc-400">·</span>
        <span className="font-medium text-zinc-900">{engagement.commentCount}</span>{" "}
        {engagement.commentCount === 1 ? "reply" : "replies"}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LikeButton
          postId={postId}
          likeCount={engagement.likeCount}
          liked={engagement.likedByViewer}
        />
        <SaveButton postId={postId} saved={engagement.savedByViewer} />
        <span className="ml-1 rounded-full bg-zinc-200/60 px-2.5 py-1 text-[11px] tabular-nums text-zinc-700">
          {engagement.commentCount}{" "}
          {engagement.commentCount === 1 ? "reply" : "replies"}
        </span>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Thread
        </h3>
        <CommentThread comments={comments} viewerProfileId={viewerProfileId} />
        {viewerProfileId ? (
          <CommentForm postId={postId} />
        ) : (
          <p className="text-[11px] text-zinc-600">
            Sign in to join the conversation.
          </p>
        )}
      </div>
    </div>
  );
}
