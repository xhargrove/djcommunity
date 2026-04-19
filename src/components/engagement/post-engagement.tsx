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
  viewerProfileId: string;
}) {
  return (
    <div className="space-y-4 border-t border-[var(--border)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <LikeButton
          postId={postId}
          likeCount={engagement.likeCount}
          liked={engagement.likedByViewer}
        />
        <SaveButton postId={postId} saved={engagement.savedByViewer} />
        <span className="text-xs text-zinc-500">
          {engagement.commentCount}{" "}
          {engagement.commentCount === 1 ? "comment" : "comments"}
        </span>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Comments
        </h3>
        <CommentThread comments={comments} viewerProfileId={viewerProfileId} />
        <CommentForm postId={postId} />
      </div>
    </div>
  );
}
