import "server-only";

import { logServerError } from "@/lib/observability/server-log";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow, RoomMembershipRow, RoomMessageRow } from "@/types/database";

export type RoomMessageView = {
  id: string;
  room_id: string;
  body: string;
  created_at: string;
  sender: {
    profile_id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    role: RoomMembershipRow["role"] | null;
  };
};

function sortMessages(rows: RoomMessageView[]): RoomMessageView[] {
  return [...rows].sort((a, b) => {
    const t = a.created_at.localeCompare(b.created_at);
    if (t !== 0) {
      return t;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Initial history for a room (members only via RLS).
 */
export async function listRoomMessages(
  roomId: string,
  limit = 200,
): Promise<RoomMessageView[]> {
  const supabase = await createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .from("room_messages")
    .select("id, room_id, sender_profile_id, body, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    logServerError("listRoomMessages", error, "rooms");
    return [];
  }

  const msgs = (rows ?? []) as Pick<
    RoomMessageRow,
    "id" | "room_id" | "sender_profile_id" | "body" | "created_at"
  >[];
  if (msgs.length === 0) {
    return [];
  }

  const senderIds = [...new Set(msgs.map((m) => m.sender_profile_id))];
  const [{ data: profs }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url")
      .in("id", senderIds),
    supabase
      .from("room_memberships")
      .select("profile_id, role")
      .eq("room_id", roomId)
      .in("profile_id", senderIds),
  ]);

  const pmap = new Map(
    (
      (profs ?? []) as Pick<
        ProfileRow,
        "id" | "handle" | "display_name" | "avatar_url"
      >[]
    ).map((p) => [p.id, p]),
  );
  const roleMap = new Map(
    (
      (memberships ?? []) as Pick<RoomMembershipRow, "profile_id" | "role">[]
    ).map((m) => [m.profile_id, m.role]),
  );

  const out: RoomMessageView[] = msgs.map((m) => {
    const p = pmap.get(m.sender_profile_id);
    return {
      id: m.id,
      room_id: m.room_id,
      body: m.body,
      created_at: m.created_at,
      sender: {
        profile_id: m.sender_profile_id,
        handle: p?.handle ?? "?",
        display_name: p?.display_name ?? "Unknown",
        avatar_url: p?.avatar_url ?? null,
        role: roleMap.get(m.sender_profile_id) ?? null,
      },
    };
  });

  return sortMessages(out);
}
