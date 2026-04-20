"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { commentBodySchema } from "@/lib/engagement/schema";
import {
  USER_ACTION_RATE,
  userActionRateLimitAllowed,
} from "@/lib/rate-limit/user-action-rate-limit";
import { getPostById } from "@/lib/posts/queries";
import { profilePublicPath } from "@/lib/profile/paths";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function engagementRateLimited(
  userId: string,
): Promise<ActionResult | null> {
  if (
    !(await userActionRateLimitAllowed(
      userId,
      "engagement:toggle",
      USER_ACTION_RATE.engagementToggle.max,
      USER_ACTION_RATE.engagementToggle.windowMs,
    ))
  ) {
    return { ok: false, error: "Slow down — try again in a moment." };
  }
  return null;
}

async function revalidateProfileById(profileId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", profileId)
    .maybeSingle();
  const row = data as { handle: string } | null;
  if (row?.handle) {
    revalidatePath(profilePublicPath(row.handle));
  }
}

export async function toggleLikeAction(postId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to like posts." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete your profile first." };
  }

  const limited = await engagementRateLimited(user.id);
  if (limited) {
    return limited;
  }

  const post = await getPostById(postId);
  if (!post) {
    return { ok: false, error: "Post not found." };
  }

  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  const row = existing as { post_id: string } | null;

  if (row) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("profile_id", profile.id);
    if (error) {
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("post_likes").insert({
      post_id: postId,
      profile_id: profile.id,
    } as never);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/", "layout");
  revalidatePath(ROUTES.home);
  return { ok: true };
}

export async function toggleSaveAction(postId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to save posts." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete your profile first." };
  }

  const limited = await engagementRateLimited(user.id);
  if (limited) {
    return limited;
  }

  const post = await getPostById(postId);
  if (!post) {
    return { ok: false, error: "Post not found." };
  }

  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("post_saves")
    .select("post_id")
    .eq("post_id", postId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  const row = existing as { post_id: string } | null;

  if (row) {
    const { error } = await supabase
      .from("post_saves")
      .delete()
      .eq("post_id", postId)
      .eq("profile_id", profile.id);
    if (error) {
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("post_saves").insert({
      post_id: postId,
      profile_id: profile.id,
    } as never);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath(ROUTES.home);
  return { ok: true };
}

export type CommentFormState = { ok: true } | { ok: false; error: string };

export async function addCommentAction(
  _prev: CommentFormState | undefined,
  formData: FormData,
): Promise<CommentFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to comment." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete your profile first." };
  }

  const limited = await engagementRateLimited(user.id);
  if (limited) {
    return limited;
  }

  const postId = String(formData.get("post_id") ?? "");
  const bodyParsed = commentBodySchema.safeParse(
    String(formData.get("body") ?? ""),
  );
  if (!bodyParsed.success) {
    return {
      ok: false,
      error: bodyParsed.error.issues[0]?.message ?? "Invalid comment.",
    };
  }

  const post = await getPostById(postId);
  if (!post) {
    return { ok: false, error: "Post not found." };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    author_profile_id: profile.id,
    body: bodyParsed.data,
  } as never);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath(ROUTES.home);
  return { ok: true };
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "No profile." };
  }

  const supabase = await createServerSupabaseClient();

  const { data: row } = await supabase
    .from("post_comments")
    .select("id, author_profile_id")
    .eq("id", commentId)
    .maybeSingle();

  const comment = row as { id: string; author_profile_id: string } | null;
  if (!comment || comment.author_profile_id !== profile.id) {
    return { ok: false, error: "You cannot delete this comment." };
  }

  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.home);
  return { ok: true };
}

export async function toggleFollowAction(targetProfileId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to follow." };
  }

  const viewer = await getProfileByUserId(user.id);
  if (!viewer) {
    return { ok: false, error: "Complete your profile first." };
  }

  const limited = await engagementRateLimited(user.id);
  if (limited) {
    return limited;
  }

  if (viewer.id === targetProfileId) {
    return { ok: false, error: "You cannot follow yourself." };
  }

  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", viewer.id)
    .eq("following_id", targetProfileId)
    .maybeSingle();

  const row = existing as { follower_id: string } | null;

  if (row) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", viewer.id)
      .eq("following_id", targetProfileId);
    if (error) {
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("follows").insert({
      follower_id: viewer.id,
      following_id: targetProfileId,
    } as never);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  await revalidateProfileById(targetProfileId);
  await revalidateProfileById(viewer.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
