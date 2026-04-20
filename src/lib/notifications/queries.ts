import "server-only";

import { logServerError } from "@/lib/observability/server-log";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { NotificationRow, ProfileRow, RoomRow } from "@/types/database";

export type NotificationType =
  | "follow"
  | "post_like"
  | "post_comment"
  | "room_message";

export type NotificationListItem = NotificationRow & {
  actor: Pick<ProfileRow, "handle" | "display_name" | "avatar_url">;
  room: Pick<RoomRow, "slug" | "name"> | null;
};

export async function getUnreadNotificationCount(
  recipientProfileId: string,
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_profile_id", recipientProfileId)
    .is("read_at", null);

  if (error) {
    logServerError("getUnreadNotificationCount", error, "notifications");
    return 0;
  }
  return count ?? 0;
}

export async function listNotifications(
  recipientProfileId: string,
  limit = 80,
): Promise<NotificationListItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_profile_id", recipientProfileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) {
    if (error) {
      logServerError("listNotifications", error, "notifications");
    }
    return [];
  }

  const notes = rows as NotificationRow[];
  const actorIds = [...new Set(notes.map((n) => n.actor_profile_id))];
  const roomIds = [
    ...new Set(
      notes.map((n) => n.room_id).filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: actors }, { data: rooms }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url")
      .in("id", actorIds),
    roomIds.length
      ? supabase.from("rooms").select("id, slug, name").in("id", roomIds)
      : Promise.resolve({ data: [] as { id: string; slug: string; name: string }[] }),
  ]);

  const actorMap = new Map(
    (
      (actors ?? []) as Pick<
        ProfileRow,
        "id" | "handle" | "display_name" | "avatar_url"
      >[]
    ).map((p) => [p.id, p] as const),
  );
  const roomMap = new Map(
    ((rooms ?? []) as Pick<RoomRow, "id" | "slug" | "name">[]).map((r) => [
      r.id,
      r,
    ]),
  );

  return notes.map((n) => {
    const actor = actorMap.get(n.actor_profile_id);
    const room = n.room_id ? roomMap.get(n.room_id) ?? null : null;
    return {
      ...n,
      actor: actor ?? {
        handle: "?",
        display_name: "Unknown",
        avatar_url: null,
      },
      room: room
        ? { slug: room.slug, name: room.name }
        : null,
    };
  });
}
