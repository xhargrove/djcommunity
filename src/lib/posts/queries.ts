import "server-only";

import { logServerError } from "@/lib/observability/server-log";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBlockedProfileIdsForViewer } from "@/lib/trust/queries";
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

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

function publicUrlForStoragePath(
  supabase: ServerClient,
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

async function hydrateFeedItems(
  supabase: ServerClient,
  postRows: PostRow[],
  viewerProfileId: string | null,
  blockedForViewer: Set<string>,
): Promise<FeedItem[]> {
  if (postRows.length === 0) {
    return [];
  }

  const profileIds = [...new Set(postRows.map((p) => p.profile_id))];

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .in("id", profileIds);

  if (profErr || !profiles) {
    logServerError("hydrateFeedItems profiles", profErr, "database");
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
  ]);

  const likeCountMap = countByPostId(
    (likeRows ?? []) as { post_id: string }[],
  );

  const likedSet = new Set(
    (viewerLikeRows ?? []).map((r: { post_id: string }) => r.post_id),
  );
  const savedSet = new Set(
    (viewerSaveRows ?? []).map((r: { post_id: string }) => r.post_id),
  );

  const commentRows = (commentRowsRaw ?? []) as PostCommentRow[];
  const visibleComments = commentRows.filter(
    (c) => !blockedForViewer.has(c.author_profile_id),
  );
  const commentTotalsFiltered = countByPostId(visibleComments);

  const commentsByPost = new Map<string, PostCommentRow[]>();
  for (const c of visibleComments) {
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
    ...new Set(visibleComments.map((c) => c.author_profile_id)),
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
      commentCount: commentTotalsFiltered.get(post.id) ?? 0,
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
      logServerError("listFeedPosts posts", postsErr, "database");
    }
    return [];
  }

  const blocked =
    viewerProfileId != null
      ? await getBlockedProfileIdsForViewer(viewerProfileId)
      : new Set<string>();
  const postRows = (posts as PostRow[]).filter((p) => !blocked.has(p.profile_id));
  return hydrateFeedItems(supabase, postRows, viewerProfileId, blocked);
}

/** Posts by a single author (e.g. public profile grid / feed section). */
export async function listFeedPostsForAuthor(
  authorProfileId: string,
  limit = 24,
  viewerProfileId: string | null = null,
): Promise<FeedItem[]> {
  if (
    viewerProfileId != null &&
    viewerProfileId !== authorProfileId
  ) {
    const blocked = await getBlockedProfileIdsForViewer(viewerProfileId);
    if (blocked.has(authorProfileId)) {
      return [];
    }
  }

  const supabase = await createServerSupabaseClient();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("profile_id", authorProfileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !posts?.length) {
    if (error) {
      logServerError("listFeedPostsForAuthor", error, "database");
    }
    return [];
  }

  const blocked =
    viewerProfileId != null
      ? await getBlockedProfileIdsForViewer(viewerProfileId)
      : new Set<string>();
  return hydrateFeedItems(
    supabase,
    posts as PostRow[],
    viewerProfileId,
    blocked,
  );
}

/**
 * Hydrate feed items for specific posts, preserving the order of `postIds`.
 */
export async function listFeedPostsByIds(
  postIds: string[],
  viewerProfileId: string | null,
): Promise<FeedItem[]> {
  if (postIds.length === 0) {
    return [];
  }
  const supabase = await createServerSupabaseClient();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .in("id", postIds);

  if (error || !posts?.length) {
    if (error) {
      logServerError("listFeedPostsByIds", error, "database");
    }
    return [];
  }

  const blocked =
    viewerProfileId != null
      ? await getBlockedProfileIdsForViewer(viewerProfileId)
      : new Set<string>();
  const rows = (posts as PostRow[]).filter((p) => !blocked.has(p.profile_id));
  const orderMap = new Map(postIds.map((id, i) => [id, i] as const));
  rows.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
  );

  return hydrateFeedItems(supabase, rows, viewerProfileId, blocked);
}

export async function getPostById(postId: string): Promise<PostRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    logServerError("getPostById", error, "database");
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
    logServerError("listMediaForPost", error, "database");
    return [];
  }
  return (data ?? []) as PostMediaRow[];
}
