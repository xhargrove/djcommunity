"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { roomMessageBodySchema } from "@/lib/rooms/message-schema";
import { getMembership, getRoomById } from "@/lib/rooms/queries";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow, RoomMessageRow } from "@/types/database";
import type { RoomMessageView } from "@/lib/rooms/messages-queries";

export type RoomMessageActionResult =
  | { ok: true; message: RoomMessageView }
  | { ok: false; error: string };

function toView(
  row: Pick<
    RoomMessageRow,
    "id" | "room_id" | "sender_profile_id" | "body" | "created_at"
  >,
  profile: Pick<ProfileRow, "id" | "handle" | "display_name" | "avatar_url">,
): RoomMessageView {
  return {
    id: row.id,
    room_id: row.room_id,
    body: row.body,
    created_at: row.created_at,
    sender: {
      profile_id: row.sender_profile_id,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    },
  };
}

export async function sendRoomMessageAction(
  roomId: string,
  bodyRaw: string,
): Promise<RoomMessageActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to send messages." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete your profile first." };
  }

  const membership = await getMembership(roomId, profile.id);
  if (!membership) {
    return { ok: false, error: "You must be a member of this room to chat." };
  }

  const parsed = roomMessageBodySchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid message.",
    };
  }

  const room = await getRoomById(roomId);
  if (!room) {
    return { ok: false, error: "Room not found." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: insertedRaw, error } = await supabase
    .from("room_messages")
    .insert({
      room_id: roomId,
      sender_profile_id: profile.id,
      body: parsed.data,
    } as never)
    .select("id, room_id, sender_profile_id, body, created_at")
    .single();

  const inserted = insertedRaw as Pick<
    RoomMessageRow,
    "id" | "room_id" | "sender_profile_id" | "body" | "created_at"
  > | null;

  if (error || !inserted) {
    console.error("sendRoomMessage", error);
    return { ok: false, error: error?.message ?? "Could not send message." };
  }

  revalidatePath(ROUTES.room(room.slug));
  return { ok: true, message: toView(inserted, profile) };
}

export type DeleteRoomMessageResult = { ok: true } | { ok: false; error: string };

export async function deleteRoomMessageAction(
  roomId: string,
  messageId: string,
): Promise<DeleteRoomMessageResult> {
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

  const membership = await getMembership(roomId, profile.id);
  if (!membership) {
    return { ok: false, error: "Not a member." };
  }

  const supabase = await createServerSupabaseClient();

  const { data: msg } = await supabase
    .from("room_messages")
    .select("id, sender_profile_id")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .maybeSingle();

  const row = msg as { id: string; sender_profile_id: string } | null;
  if (!row) {
    return { ok: false, error: "Message not found." };
  }

  const isOwn = row.sender_profile_id === profile.id;
  const isMod = membership.role === "owner" || membership.role === "admin";
  if (!isOwn && !isMod) {
    return { ok: false, error: "You cannot delete this message." };
  }

  const { error } = await supabase.from("room_messages").delete().eq("id", messageId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.room(room.slug));
  return { ok: true };
}
