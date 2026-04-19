"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import {
  createPostSchema,
  updatePostSchema,
} from "@/lib/posts/schema";
import { getPostById, listMediaForPost } from "@/lib/posts/queries";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PostFormState = { ok: true } | { ok: false; error: string };

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
    console.error("removeStoragePaths", error);
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

  const parsed = createPostSchema.safeParse({
    caption: String(formData.get("caption") ?? ""),
    post_type: String(formData.get("post_type") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid post.",
    };
  }

  const supabase = await createServerSupabaseClient();

  const row = {
    profile_id: profile.id,
    caption: parsed.data.caption,
    post_type: parsed.data.post_type,
  };

  const { data: insertedRaw, error: insertErr } = await supabase
    .from("posts")
    .insert(row as never)
    .select("id")
    .single();

  const inserted = insertedRaw as { id: string } | null;

  if (insertErr || !inserted?.id) {
    console.error("createPost insert", insertErr);
    return {
      ok: false,
      error: insertErr?.message ?? "Could not create post.",
    };
  }

  const postId = inserted.id;
  const file = formData.get("media");

  if (!(file instanceof File) || file.size === 0) {
    revalidatePath(ROUTES.home);
    return { ok: true };
  }

  const mime = file.type || "application/octet-stream";
  const kind = classifyMedia(mime);
  if (!kind) {
    await supabase.from("posts").delete().eq("id", postId);
    return {
      ok: false,
      error: "Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV.",
    };
  }

  if (file.size > maxBytesForKind(kind)) {
    await supabase.from("posts").delete().eq("id", postId);
    return {
      ok: false,
      error:
        kind === "image"
          ? "Image must be 8MB or smaller."
          : "Video must be 50MB or smaller.",
    };
  }

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
    console.error("createPost upload", upErr);
    await supabase.from("posts").delete().eq("id", postId);
    return { ok: false, error: upErr.message };
  }

  const { error: mediaErr } = await supabase.from("post_media").insert({
    post_id: postId,
    storage_path: storagePath,
    kind,
    mime_type: mime,
    sort_order: 0,
  } as never);

  if (mediaErr) {
    console.error("createPost post_media", mediaErr);
    await removeStoragePaths([storagePath]);
    await supabase.from("posts").delete().eq("id", postId);
    return {
      ok: false,
      error: "Post was not saved. Try again.",
    };
  }

  revalidatePath(ROUTES.home);
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
    console.error("updatePost", error);
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
    console.error("deletePost", error);
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.home);
  return { ok: true };
}
