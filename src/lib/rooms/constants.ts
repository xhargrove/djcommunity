/** Must match Postgres enums `room_visibility`, `room_type`, `room_member_role`. */

export const ROOM_VISIBILITIES = ["public", "private"] as const;
export type RoomVisibility = (typeof ROOM_VISIBILITIES)[number];

export const ROOM_TYPES = ["city", "crew", "topic"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_MEMBER_ROLES = ["owner", "admin", "member"] as const;
export type RoomMemberRole = (typeof ROOM_MEMBER_ROLES)[number];

export const ROOM_VISIBILITY_LABELS: Record<RoomVisibility, string> = {
  public: "Public",
  private: "Private",
};

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  city: "City room",
  crew: "Crew room",
  topic: "Topic room",
};
