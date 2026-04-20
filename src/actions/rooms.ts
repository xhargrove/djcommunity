"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { logServerError } from "@/lib/observability/server-log";
import { normalizeHandleInput } from "@/lib/profile/handle";
import { getProfileByHandle, getProfileByUserId } from "@/lib/profile/queries";
import {
  createRoomSchema,
  updateRoomVisibilitySchema,
} from "@/lib/rooms/schema";
import {
  getMembership,
  getRoomById,
} from "@/lib/rooms/queries";
import { isValidRoomSlug, normalizeRoomSlug } from "@/lib/rooms/slug";
import { ROUTES } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RoomActionResult = { ok: true } | { ok: false; error: string };

export type CreateRoomFormState =
  | { ok: true; slug: string }
  | { ok: false; error: string };

function revalidateRoom(slug: string) {
  revalidatePath(ROUTES.rooms);
  revalidatePath(ROUTES.room(slug));
}

export async function createRoomAction(
  _prev: CreateRoomFormState | undefined,
  formData: FormData,
): Promise<CreateRoomFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to create a room." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete your profile first." };
  }

  const name = String(formData.get("name") ?? "");
  const slugRaw = String(formData.get("slug") ?? "");
  const slugCandidate = slugRaw.trim()
    ? normalizeRoomSlug(slugRaw)
    : normalizeRoomSlug(name);

  if (!isValidRoomSlug(slugCandidate)) {
    return {
      ok: false,
      error:
        "Choose a valid slug (3–64 chars, lowercase letters, numbers, hyphens, underscores).",
    };
  }

  const parsed = createRoomSchema.safeParse({
    name,
    slug: slugCandidate,
    description: String(formData.get("description") ?? ""),
    visibility: String(formData.get("visibility") ?? "public"),
    room_type: String(formData.get("room_type") ?? "topic"),
    city_id: String(formData.get("city_id") ?? ""),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid room data.",
    };
  }

  const supabase = await createServerSupabaseClient();

  const roomRow = {
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description,
    visibility: parsed.data.visibility,
    room_type: parsed.data.room_type,
    city_id: parsed.data.city_id,
    created_by_profile_id: profile.id,
  };

  const { data: createdRaw, error: roomErr } = await supabase
    .from("rooms")
    .insert(roomRow as never)
    .select("id")
    .single();

  const created = createdRaw as { id: string } | null;

  if (roomErr || !created?.id) {
    if (roomErr?.code === "23505") {
      return { ok: false, error: "That slug is already taken. Choose another." };
    }
    logServerError("createRoom", roomErr, "rooms");
    return { ok: false, error: roomErr?.message ?? "Could not create room." };
  }

  const { error: memErr } = await supabase.from("room_memberships").insert({
    room_id: created.id,
    profile_id: profile.id,
    role: "owner",
  } as never);

  if (memErr) {
    logServerError("createRoom membership", memErr, "rooms");
    await supabase.from("rooms").delete().eq("id", created.id);
    return {
      ok: false,
      error: "Room was not created. Try again.",
    };
  }

  revalidateRoom(parsed.data.slug);
  return { ok: true, slug: parsed.data.slug };
}

export async function updateRoomVisibilityAction(
  roomId: string,
  visibilityRaw: string,
): Promise<RoomActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "No profile." };
  }

  const parsed = updateRoomVisibilitySchema.safeParse({
    visibility: visibilityRaw,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid visibility.",
    };
  }

  const room = await getRoomById(roomId);
  if (!room) {
    return { ok: false, error: "Room not found." };
  }

  const m = await getMembership(roomId, profile.id);
  if (!m || (m.role !== "owner" && m.role !== "admin")) {
    return {
      ok: false,
      error: "Only the room owner or an admin can change visibility.",
    };
  }

  if (room.visibility === parsed.data.visibility) {
    return { ok: true };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("rooms")
    .update({ visibility: parsed.data.visibility } as never)
    .eq("id", roomId);

  if (error) {
    logServerError("updateRoomVisibility", error, "rooms");
    return { ok: false, error: error.message };
  }

  revalidateRoom(room.slug);
  revalidatePath(ROUTES.explore, "layout");
  return { ok: true };
}

export async function joinRoomAction(roomId: string): Promise<RoomActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to join." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete your profile first." };
  }

  const room = await getRoomById(roomId);
  if (!room) {
    return { ok: false, error: "Room not found or not accessible." };
  }

  if (room.visibility !== "public") {
    return {
      ok: false,
      error: "This is a private room. Ask an admin to invite you.",
    };
  }

  const existing = await getMembership(roomId, profile.id);
  if (existing) {
    return { ok: false, error: "You are already a member." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("room_memberships").insert({
    room_id: roomId,
    profile_id: profile.id,
    role: "member",
  } as never);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoom(room.slug);
  return { ok: true };
}

export async function leaveRoomAction(roomId: string): Promise<RoomActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "No profile." };
  }

  const room = await getRoomById(roomId);
  if (!room) {
    return { ok: false, error: "Room not found." };
  }

  const m = await getMembership(roomId, profile.id);
  if (!m) {
    return { ok: false, error: "You are not a member." };
  }

  if (m.role === "owner") {
    return {
      ok: false,
      error: "Owners cannot leave. Delete the room or transfer ownership (coming later).",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("room_memberships")
    .delete()
    .eq("room_id", roomId)
    .eq("profile_id", profile.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoom(room.slug);
  return { ok: true };
}

export async function deleteRoomAction(roomId: string): Promise<RoomActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "No profile." };
  }

  const room = await getRoomById(roomId);
  if (!room) {
    return { ok: false, error: "Room not found." };
  }

  const m = await getMembership(roomId, profile.id);
  if (!m || m.role !== "owner") {
    return { ok: false, error: "Only the room owner can delete the room." };
  }

  const slug = room.slug;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.rooms);
  revalidatePath(ROUTES.room(slug));
  return { ok: true };
}

export async function inviteMemberAction(
  roomId: string,
  handleRaw: string,
): Promise<RoomActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "No profile." };
  }

  const room = await getRoomById(roomId);
  if (!room) {
    return { ok: false, error: "Room not found." };
  }

  const m = await getMembership(roomId, profile.id);
  if (!m || (m.role !== "owner" && m.role !== "admin")) {
    return { ok: false, error: "Only owners and admins can invite members." };
  }

  const handle = normalizeHandleInput(handleRaw);
  const target = await getProfileByHandle(handle);
  if (!target) {
    return { ok: false, error: "No profile found with that handle." };
  }

  if (target.id === profile.id) {
    return { ok: false, error: "You cannot invite yourself." };
  }

  const existing = await getMembership(roomId, target.id);
  if (existing) {
    return { ok: false, error: "That user is already a member." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("room_memberships").insert({
    room_id: roomId,
    profile_id: target.id,
    role: "member",
  } as never);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoom(room.slug);
  return { ok: true };
}
