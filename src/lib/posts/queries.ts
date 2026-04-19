import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  PostRow,
  PostMediaRow,
  PostCommentRow,
  ProfileRow,
} from "@/types/database";

export type FeedAuthor = Pick<
  ProfileRow,
  "handle" | "display_name" | "avatar_url"
> & { profile_id: string };

export type FeedMediaItem = {
  id: string;
  kind: "image" | "video";
  publicUrl: string;
  mime_type: string;
};

export type CommentAuthor = Pick<
  ProfileRow,
  "handle" | "display_name" | "avatar_url"
> & { profile_id: string };

export type FeedComment = {
  id: string;
  body: string;
  created_at: string;
  author: CommentAuthor;
};

export type PostEngagementState = {
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  savedByViewer: boolean;
};

export type FeedItem = {
  post: PostRow;
  author: FeedAuthor;
  media: FeedMediaItem[];
  engagement: PostEngagementState;
  comments: FeedComment[];
};

function publicUrlForStoragePath(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storagePath: string,
): string {
  const { data } = supabase.storage.from("post_media").getPublicUrl(storagePath);
  return data.publicUrl;
}

function countByPostId(rows: { post_id: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.post_id, (m.get(r.post_id) ?? 0) + 1);
  }
  return m;
}

export async function listFeedPosts(
  limit = 50,
  viewerProfileId: string | null = null,
): Promise<FeedItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (postsErr || !posts?.length) {
    if (postsErr) {
      console.error("listFeedPosts posts", postsErr);
    }
    return [];
  }

  const postRows = posts as PostRow[];
  const profileIds = [...new Set(postRows.map((p) => p.profile_id))];

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .in("id", profileIds);

  if (profErr || !profiles) {
    console.error("listFeedPosts profiles", profErr);
    return [];
  }

  type ProfileSlice = Pick<
    ProfileRow,
    "id" | "handle" | "display_name" | "avatar_url"
  >;
  const profileRows = profiles as ProfileSlice[];

  const profileMap = new Map(
    profileRows.map((p) => [p.id, p] as const),
  );

  const postIds = postRows.map((p) => p.id);
  const { data: mediaRows } = await supabase
    .from("post_media")
    .select("*")
    .in("post_id", postIds)
    .order("sort_order", { ascending: true });

  const mediaByPost = new Map<string, PostMediaRow[]>();
  for (const m of (mediaRows ?? []) as PostMediaRow[]) {
    const list = mediaByPost.get(m.post_id) ?? [];
    list.push(m);
    mediaByPost.set(m.post_id, list);
  }

  const [
    { data: likeRows },
    { data: commentRowsRaw },
    { data: viewerLikeRows },
    { data: viewerSaveRows },
    { data: commentCountRows },
  ] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", postIds),
    supabase
      .from("post_comments")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: false })
      .limit(1200),
    viewerProfileId
      ? supabase
          .from("post_likes")
          .select("post_id")
          .eq("profile_id", viewerProfileId)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    viewerProfileId
      ? supabase
          .from("post_saves")
          .select("post_id")
          .eq("profile_id", viewerProfileId)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    supabase.from("post_comments").select("post_id").in("post_id", postIds),
  ]);

  const likeCountMap = countByPostId(
    (likeRows ?? []) as { post_id: string }[],
  );

  const commentTotals = countByPostId(
    (commentCountRows ?? []) as { post_id: string }[],
  );

  const likedSet = new Set(
    (viewerLikeRows ?? []).map((r: { post_id: string }) => r.post_id),
  );
  const savedSet = new Set(
    (viewerSaveRows ?? []).map((r: { post_id: string }) => r.post_id),
  );

  const commentRows = (commentRowsRaw ?? []) as PostCommentRow[];
  const commentsByPost = new Map<string, PostCommentRow[]>();
  for (const c of commentRows) {
    const g = commentsByPost.get(c.post_id) ?? [];
    if (g.length >= 35) {
      continue;
    }
    g.push(c);
    commentsByPost.set(c.post_id, g);
  }
  for (const rows of commentsByPost.values()) {
    rows.reverse();
  }

  const commentAuthorIds = [
    ...new Set(commentRows.map((c) => c.author_profile_id)),
  ];
  let commentAuthorMap = new Map<
    string,
    Pick<ProfileRow, "handle" | "display_name" | "avatar_url"> & { id: string }
  >();
  if (commentAuthorIds.length > 0) {
    const { data: caprofs } = await supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url")
      .in("id", commentAuthorIds);
    commentAuthorMap = new Map(
      ((caprofs ?? []) as ProfileSlice[]).map((p) => [p.id, p]),
    );
  }

  return postRows.map((post) => {
    const prof = profileMap.get(post.profile_id);
    const author: FeedAuthor = {
      profile_id: post.profile_id,
      handle: prof?.handle ?? "?",
      display_name: prof?.display_name ?? "Unknown",
      avatar_url: prof?.avatar_url ?? null,
    };
    const rawMedia = mediaByPost.get(post.id) ?? [];
    const media: FeedMediaItem[] = rawMedia.map((row) => ({
      id: row.id,
      kind: row.kind as "image" | "video",
      publicUrl: publicUrlForStoragePath(supabase, row.storage_path),
      mime_type: row.mime_type,
    }));

    const engagement: PostEngagementState = {
      likeCount: likeCountMap.get(post.id) ?? 0,
      commentCount: commentTotals.get(post.id) ?? 0,
      likedByViewer: likedSet.has(post.id),
      savedByViewer: savedSet.has(post.id),
    };

    const rawComments = commentsByPost.get(post.id) ?? [];
    const comments: FeedComment[] = rawComments.map((row) => {
      const ap = commentAuthorMap.get(row.author_profile_id);
      return {
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        author: {
          profile_id: row.author_profile_id,
          handle: ap?.handle ?? "?",
          display_name: ap?.display_name ?? "Unknown",
          avatar_url: ap?.avatar_url ?? null,
        },
      };
    });

    return { post, author, media, engagement, comments };
  });
}

export async function getPostById(postId: string): Promise<PostRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    console.error("getPostById", error);
    return null;
  }
  return data as PostRow | null;
}

export async function listMediaForPost(
  postId: string,
): Promise<PostMediaRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("post_media")
    .select("*")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("listMediaForPost", error);
    return [];
  }
  return (data ?? []) as PostMediaRow[];
}
