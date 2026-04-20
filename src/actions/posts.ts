"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { POST_CAROUSEL_MAX_MEDIA } from "@/lib/posts/constants";
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

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function classifyMedia(mime: string): "image" | "video" | null {
  if (IMAGE_MIMES.has(mime)) {
    return "image";
  }
  if (VIDEO_MIMES.has(mime)) {
    return "video";
  }
  return null;
}

function maxBytesForKind(kind: "image" | "video"): number {
  return kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
}

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
  const rawMedia = formData.getAll("media");
  const files = rawMedia.filter(
    (item): item is File => item instanceof File && item.size > 0,
  );

  if (files.length === 0) {
    revalidatePath(ROUTES.home);
    revalidatePath(ROUTES.create);
    return { ok: true, postId };
  }

  if (files.length > POST_CAROUSEL_MAX_MEDIA) {
    await supabase.from("posts").delete().eq("id", postId);
    return {
      ok: false,
      error: `You can attach up to ${POST_CAROUSEL_MAX_MEDIA} photos or videos per post.`,
    };
  }

  for (const file of files) {
    const mime = file.type || "application/octet-stream";
    const kind = classifyMedia(mime);
    if (!kind) {
      await supabase.from("posts").delete().eq("id", postId);
      return {
        ok: false,
        error:
          "Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV.",
      };
    }
    if (file.size > maxBytesForKind(kind)) {
      await supabase.from("posts").delete().eq("id", postId);
      return {
        ok: false,
        error:
          kind === "image"
            ? "Each image must be 8MB or smaller."
            : "Each video must be 50MB or smaller.",
      };
    }
  }

  const uploadedPaths: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const mime = file.type || "application/octet-stream";
    const kind = classifyMedia(mime)!;
    const ext = MIME_TO_EXT[mime] ?? (kind === "image" ? "jpg" : "mp4");
    const mediaId = crypto.randomUUID();
    const storagePath = `${user.id}/${postId}/${mediaId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("post_media")
      .upload(storagePath, file, {
        upsert: false,
        contentType: mime,
      });

    if (upErr) {
      logServerError("createPost upload", upErr, "storage");
      await removeStoragePaths(uploadedPaths);
      await supabase.from("posts").delete().eq("id", postId);
      return { ok: false, error: upErr.message };
    }

    uploadedPaths.push(storagePath);

    const { error: mediaErr } = await supabase.from("post_media").insert({
      post_id: postId,
      storage_path: storagePath,
      kind,
      mime_type: mime,
      sort_order: i,
    } as never);

    if (mediaErr) {
      logServerError("createPost post_media", mediaErr, "database");
      await removeStoragePaths(uploadedPaths);
      await supabase.from("posts").delete().eq("id", postId);
      return {
        ok: false,
        error: "Post was not saved. Try again.",
      };
    }
  }

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.create);
  return { ok: true, postId };
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
