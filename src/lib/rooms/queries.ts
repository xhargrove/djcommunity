import "server-only";

import { logServerError } from "@/lib/observability/server-log";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow, RoomMembershipRow, RoomRow } from "@/types/database";

export type RoomListItem = RoomRow & {
  creator_handle: string | null;
};

/** Rooms the profile has joined; RLS may hide rows the viewer cannot see. */
export type RoomJoinedItem = RoomListItem & {
  membership_role: RoomMembershipRow["role"];
  joined_at: string;
};

export async function listRoomsJoinedByProfile(
  profileId: string,
  limit = 16,
): Promise<RoomJoinedItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data: mships, error: mErr } = await supabase
    .from("room_memberships")
    .select("room_id, role, joined_at")
    .eq("profile_id", profileId)
    .order("joined_at", { ascending: false })
    .limit(limit);

  if (mErr || !mships?.length) {
    if (mErr) {
      logServerError("listRoomsJoinedByProfile memberships", mErr, "rooms");
    }
    return [];
  }

  const mrows = mships as Pick<
    RoomMembershipRow,
    "room_id" | "role" | "joined_at"
  >[];
  const roomIds = mrows.map((m) => m.room_id);

  const { data: roomRows, error: rErr } = await supabase
    .from("rooms")
    .select("*")
    .in("id", roomIds);

  if (rErr || !roomRows?.length) {
    if (rErr) {
      logServerError("listRoomsJoinedByProfile rooms", rErr, "rooms");
    }
    return [];
  }

  const roomMap = new Map((roomRows as RoomRow[]).map((r) => [r.id, r]));
  const creatorIds = [
    ...new Set(
      (roomRows as RoomRow[]).map((r) => r.created_by_profile_id),
    ),
  ];
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, handle")
    .in("id", creatorIds);

  const handleMap = new Map(
    ((creators ?? []) as Pick<ProfileRow, "id" | "handle">[]).map((p) => [
      p.id,
      p.handle,
    ]),
  );

  return mrows
    .map((m) => {
      const r = roomMap.get(m.room_id);
      if (!r) {
        return null;
      }
      return {
        ...r,
        creator_handle: handleMap.get(r.created_by_profile_id) ?? null,
        membership_role: m.role,
        joined_at: m.joined_at,
      };
    })
    .filter((x): x is RoomJoinedItem => x !== null);
}

export async function listVisibleRooms(): Promise<RoomListItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logServerError("listVisibleRooms", error, "rooms");
    return [];
  }

  const rows = (rooms ?? []) as RoomRow[];
  if (rows.length === 0) {
    return [];
  }

  const creatorIds = [...new Set(rows.map((r) => r.created_by_profile_id))];
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, handle")
    .in("id", creatorIds);

  const handleMap = new Map(
    ((creators ?? []) as Pick<ProfileRow, "id" | "handle">[]).map((p) => [
      p.id,
      p.handle,
    ]),
  );

  return rows.map((r) => ({
    ...r,
    creator_handle: handleMap.get(r.created_by_profile_id) ?? null,
  }));
}

export async function getCityName(cityId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("cities")
    .select("name")
    .eq("id", cityId)
    .maybeSingle();
  const row = data as { name: string } | null;
  return row?.name ?? null;
}

export async function getRoomById(roomId: string): Promise<RoomRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    logServerError("getRoomById", error, "rooms");
    return null;
  }
  return data as RoomRow | null;
}

export async function getRoomBySlug(
  slug: string,
): Promise<RoomRow | null> {
  const normalized = slug.trim().toLowerCase();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    logServerError("getRoomBySlug", error, "rooms");
    return null;
  }
  return data as RoomRow | null;
}

export async function getMembership(
  roomId: string,
  profileId: string,
): Promise<RoomMembershipRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("room_memberships")
    .select("*")
    .eq("room_id", roomId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    logServerError("getMembership", error, "rooms");
    return null;
  }
  return data as RoomMembershipRow | null;
}

export type RoomMemberRow = {
  profile_id: string;
  role: string;
  joined_at: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
};

export async function listRoomMembers(
  roomId: string,
): Promise<RoomMemberRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data: mships, error } = await supabase
    .from("room_memberships")
    .select("profile_id, role, joined_at")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error || !mships?.length) {
    if (error) {
      logServerError("listRoomMembers", error, "rooms");
    }
    return [];
  }

  const rows = mships as Pick<
    RoomMembershipRow,
    "profile_id" | "role" | "joined_at"
  >[];
  const ids = rows.map((m) => m.profile_id);
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .in("id", ids);

  const pmap = new Map(
    (
      (profs ?? []) as Pick<
        ProfileRow,
        "id" | "handle" | "display_name" | "avatar_url"
      >[]
    ).map((p) => [p.id, p]),
  );

  return rows.map((m) => {
    const p = pmap.get(m.profile_id);
    return {
      profile_id: m.profile_id,
      role: m.role,
      joined_at: m.joined_at,
      handle: p?.handle ?? "?",
      display_name: p?.display_name ?? "Unknown",
      avatar_url: p?.avatar_url ?? null,
    };
  });
}
