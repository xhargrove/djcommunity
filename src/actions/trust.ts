"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { logServerError } from "@/lib/observability/server-log";
import { profilePublicPath } from "@/lib/profile/paths";
import { getProfileByUserId } from "@/lib/profile/queries";
import { getRoomById } from "@/lib/rooms/queries";
import type { ReportTargetKind } from "@/lib/trust/kinds";
import { submitContentReportSchema } from "@/lib/trust/report-schema";
import {
  USER_ACTION_RATE,
  userActionRateLimitAllowed,
} from "@/lib/rate-limit/user-action-rate-limit";
import { ROUTES } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TrustActionResult = { ok: true } | { ok: false; error: string };

export async function blockProfileAction(
  blockedProfileId: string,
): Promise<TrustActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to block accounts." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Profile required." };
  }

  if (profile.id === blockedProfileId) {
    return { ok: false, error: "You cannot block yourself." };
  }

  if (
    !(await userActionRateLimitAllowed(
      user.id,
      "profile:block",
      USER_ACTION_RATE.blockToggle.max,
      USER_ACTION_RATE.blockToggle.windowMs,
    ))
  ) {
    return {
      ok: false,
      error: "Too many block changes in a short time. Try again later.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("profile_blocks").insert({
    blocker_profile_id: profile.id,
    blocked_profile_id: blockedProfileId,
  } as never);

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    logServerError("blockProfileAction", error, "engagement");
    return { ok: false, error: error.message };
  }

  const { data: blockedProf } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", blockedProfileId)
    .maybeSingle();
  const handle = (blockedProf as { handle: string } | null)?.handle;
  if (handle) {
    revalidatePath(profilePublicPath(handle));
  }
  revalidatePath(ROUTES.home);
  return { ok: true };
}

export async function unblockProfileAction(
  blockedProfileId: string,
): Promise<TrustActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Profile required." };
  }

  if (
    !(await userActionRateLimitAllowed(
      user.id,
      "profile:block",
      USER_ACTION_RATE.blockToggle.max,
      USER_ACTION_RATE.blockToggle.windowMs,
    ))
  ) {
    return {
      ok: false,
      error: "Too many block changes in a short time. Try again later.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profile_blocks")
    .delete()
    .eq("blocker_profile_id", profile.id)
    .eq("blocked_profile_id", blockedProfileId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: blockedProf } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", blockedProfileId)
    .maybeSingle();
  const handle = (blockedProf as { handle: string } | null)?.handle;
  if (handle) {
    revalidatePath(profilePublicPath(handle));
  }
  revalidatePath(ROUTES.home);
  return { ok: true };
}

async function verifyReportTarget(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  kind: ReportTargetKind,
  targetId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  switch (kind) {
    case "post": {
      const { data } = await supabase
        .from("posts")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();
      return data ? { ok: true } : { ok: false, error: "Post not found." };
    }
    case "post_comment": {
      const { data } = await supabase
        .from("post_comments")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();
      return data ? { ok: true } : { ok: false, error: "Comment not found." };
    }
    case "room": {
      const { data } = await supabase
        .from("rooms")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();
      return data ? { ok: true } : { ok: false, error: "Room not found." };
    }
    case "room_message": {
      const { data } = await supabase
        .from("room_messages")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();
      return data ? { ok: true } : { ok: false, error: "Message not found." };
    }
    case "profile": {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();
      if (!data) {
        return { ok: false, error: "Profile not found." };
      }
      return { ok: true };
    }
    default:
      return { ok: false, error: "Invalid report type." };
  }
}

export async function submitContentReportAction(input: {
  target_kind: ReportTargetKind;
  target_id: string;
  note?: string;
}): Promise<TrustActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to submit a report." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Profile required." };
  }

  const parsed = submitContentReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid report.",
    };
  }

  if (
    !(await userActionRateLimitAllowed(
      user.id,
      "report:submit",
      USER_ACTION_RATE.submitReport.max,
      USER_ACTION_RATE.submitReport.windowMs,
    ))
  ) {
    return {
      ok: false,
      error: "Too many reports in a short time. Try again later.",
    };
  }

  if (
    parsed.data.target_kind === "profile" &&
    parsed.data.target_id === profile.id
  ) {
    return { ok: false, error: "You cannot report your own profile." };
  }

  const supabase = await createServerSupabaseClient();
  const check = await verifyReportTarget(
    supabase,
    parsed.data.target_kind,
    parsed.data.target_id,
  );
  if (!check.ok) {
    return check;
  }

  const { error } = await supabase.from("content_reports").insert({
    reporter_profile_id: profile.id,
    target_kind: parsed.data.target_kind,
    target_id: parsed.data.target_id,
    note: parsed.data.note ?? null,
  } as never);

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    logServerError("submitContentReportAction", error, "moderation");
    return { ok: false, error: error.message };
  }

  if (parsed.data.target_kind === "room") {
    const room = await getRoomById(parsed.data.target_id);
    if (room) {
      revalidatePath(ROUTES.room(room.slug));
    }
  }

  return { ok: true };
}
