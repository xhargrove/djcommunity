"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { POST_CAROUSEL_MAX_MEDIA } from "@/lib/posts/constants";
import {
  classifyPostFeedMedia,
  isClientPostMediaStoragePath,
  maxBytesForPostFeedKind,
  postFeedFileTooLargeMessage,
} from "@/lib/posts/media-upload-rules";
import {
  createPostSchema,
  updatePostSchema,
} from "@/lib/posts/schema";
import { getPostById, listMediaForPost } from "@/lib/posts/queries";
import { logServerError } from "@/lib/observability/server-log";
import { getProfileByUserId } from "@/lib/profile/queries";
import {
  USER_ACTION_RATE,
  userActionRateLimitAllowed,
} from "@/lib/rate-limit/user-action-rate-limit";
import { ROUTES } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PostFormState =
  | { ok: true; postId: string }
  | { ok: false; error: string };

export type AttachPostMediaResult =
  | { ok: true }
  | { ok: false; error: string };

const attachMediaItemSchema = z.object({
  storagePath: z.string().min(1),
  kind: z.enum(["image", "video"]),
  mimeType: z.string().min(1),
  sortOrder: z.number().int().min(0).max(POST_CAROUSEL_MAX_MEDIA - 1),
});

const attachPostMediaInputSchema = z.object({
  postId: z.string().uuid(),
  items: z
    .array(attachMediaItemSchema)
    .min(1)
    .max(POST_CAROUSEL_MAX_MEDIA),
});

async function removeStoragePaths(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.storage.from("post_media").remove(paths);
  if (error) {
    logServerError("removeStoragePaths", error, "storage");
  }
}

export async function createPostAction(
  _prev: PostFormState | undefined,
  formData: FormData,
): Promise<PostFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to post." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete your profile before posting." };
  }

  for (const [, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      return {
        ok: false,
        error:
          "Media cannot be sent through this step (host body limit). Pick files again — they should upload from your device directly to storage.",
      };
    }
  }

  const aspectRaw = String(formData.get("media_aspect_ratio") ?? "").trim();
  const parsed = createPostSchema.safeParse({
    caption: String(formData.get("caption") ?? ""),
    post_type: String(formData.get("post_type") ?? ""),
    media_aspect_ratio: aspectRaw === "" ? undefined : aspectRaw,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid post.",
    };
  }

  if (
    !(await userActionRateLimitAllowed(
      user.id,
      "post:create",
      USER_ACTION_RATE.createPost.max,
      USER_ACTION_RATE.createPost.windowMs,
    ))
  ) {
    return {
      ok: false,
      error: "You're posting too quickly. Try again in a few minutes.",
    };
  }

  const supabase = await createServerSupabaseClient();

  const row = {
    profile_id: profile.id,
    caption: parsed.data.caption,
    post_type: parsed.data.post_type,
    media_aspect_ratio: parsed.data.media_aspect_ratio,
  };

  const { data: insertedRaw, error: insertErr } = await supabase
    .from("posts")
    .insert(row as never)
    .select("id")
    .single();

  const inserted = insertedRaw as { id: string } | null;

  if (insertErr || !inserted?.id) {
    logServerError("createPost insert", insertErr, "database");
    return {
      ok: false,
      error: insertErr?.message ?? "Could not create post.",
    };
  }

  const postId = inserted.id;

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.create);
  return { ok: true, postId };
}

/**
 * After the browser uploads each file directly to Supabase Storage (bypassing Vercel’s
 * ~4.5MB Server Action body limit), register rows in `post_media` with server-side checks.
 */
export async function attachPostMediaAfterClientUploadAction(
  input: z.infer<typeof attachPostMediaInputSchema>,
): Promise<AttachPostMediaResult> {
  const parsed = attachPostMediaInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid media payload.",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to post." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete your profile before posting." };
  }

  const post = await getPostById(parsed.data.postId);
  if (!post || post.profile_id !== profile.id) {
    return { ok: false, error: "You cannot attach media to this post." };
  }

  const existing = await listMediaForPost(parsed.data.postId);
  if (existing.length > 0) {
    return { ok: false, error: "This post already has media attached." };
  }

  const items = [...parsed.data.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const paths = items.map((i) => i.storagePath);
  if (new Set(paths).size !== paths.length) {
    return { ok: false, error: "Duplicate media paths are not allowed." };
  }

  const supabase = await createServerSupabaseClient();
  const folder = `${user.id}/${parsed.data.postId}`;
  const { data: listed, error: listErr } = await supabase.storage
    .from("post_media")
    .list(folder, { limit: POST_CAROUSEL_MAX_MEDIA + 5 });

  if (listErr) {
    logServerError("attachPostMedia list", listErr, "storage");
    return { ok: false, error: listErr.message };
  }

  const byName = new Map(
    (listed ?? []).map((o) => [o.name, o] as const),
  );

  for (const item of items) {
    if (
      !isClientPostMediaStoragePath({
        userId: user.id,
        postId: parsed.data.postId,
        storagePath: item.storagePath,
      })
    ) {
      return { ok: false, error: "Invalid media path." };
    }

    const classified = classifyPostFeedMedia(item.mimeType);
    if (!classified || classified !== item.kind) {
      return { ok: false, error: "MIME type does not match media kind." };
    }

    const baseName = item.storagePath.split("/").pop()!;
    const entry = byName.get(baseName);
    if (!entry) {
      return {
        ok: false,
        error:
          "Upload was not found in storage. Try posting again — large files upload from your device straight to storage.",
      };
    }

    const sizeRaw = entry.metadata?.size;
    const size =
      typeof sizeRaw === "number"
        ? sizeRaw
        : typeof sizeRaw === "string"
          ? Number.parseInt(sizeRaw, 10)
          : NaN;
    if (Number.isFinite(size) && size > maxBytesForPostFeedKind(item.kind)) {
      return { ok: false, error: postFeedFileTooLargeMessage(item.kind) };
    }
  }

  for (const item of items) {
    const { error: mediaErr } = await supabase.from("post_media").insert({
      post_id: parsed.data.postId,
      storage_path: item.storagePath,
      kind: item.kind,
      mime_type: item.mimeType,
      sort_order: item.sortOrder,
    } as never);

    if (mediaErr) {
      logServerError("attachPostMedia insert", mediaErr, "database");
      await removeStoragePaths(paths);
      await supabase.from("posts").delete().eq("id", parsed.data.postId);
      return {
        ok: false,
        error: "Post was not saved. Try again.",
      };
    }
  }

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.create);
  return { ok: true };
}

export type PostUpdateResult = { ok: true } | { ok: false; error: string };

export async function updatePostAction(
  formData: FormData,
): Promise<PostUpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "No profile found." };
  }

  const parsed = updatePostSchema.safeParse({
    post_id: String(formData.get("post_id") ?? ""),
    caption: String(formData.get("caption") ?? ""),
    post_type: String(formData.get("post_type") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data.",
    };
  }

  const post = await getPostById(parsed.data.post_id);
  if (!post || post.profile_id !== profile.id) {
    return { ok: false, error: "You cannot edit this post." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("posts")
    .update({
      caption: parsed.data.caption,
      post_type: parsed.data.post_type,
    } as never)
    .eq("id", parsed.data.post_id);

  if (error) {
    logServerError("updatePost", error, "database");
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.postEdit(parsed.data.post_id));
  return { ok: true };
}

export type DeletePostResult = { ok: true } | { ok: false; error: string };

export async function deletePostAction(postId: string): Promise<DeletePostResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete your profile first." };
  }

  const post = await getPostById(postId);
  if (!post || post.profile_id !== profile.id) {
    return { ok: false, error: "You cannot delete this post." };
  }

  const media = await listMediaForPost(postId);
  const paths = media.map((m) => m.storage_path);

  await removeStoragePaths(paths);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (error) {
    logServerError("deletePost", error, "database");
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.home);
  return { ok: true };
}
