import { z } from "zod";

import {
  ROOM_TYPES,
  ROOM_VISIBILITIES,
  type RoomType,
  type RoomVisibility,
} from "@/lib/rooms/constants";
import { isValidRoomSlug, normalizeRoomSlug } from "@/lib/rooms/slug";

const vis = ROOM_VISIBILITIES as unknown as [RoomVisibility, ...RoomVisibility[]];
const rtypes = ROOM_TYPES as unknown as [RoomType, ...RoomType[]];

export const createRoomSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(120),
  slug: z
    .string()
    .transform((s) => normalizeRoomSlug(s))
    .refine(isValidRoomSlug, {
      message:
        "Slug must be 3–64 characters: lowercase letters, numbers, hyphens, underscores; not at start/end.",
    }),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((s) =>
      s === undefined || s.length === 0 ? null : s,
    ),
  visibility: z.enum(vis),
  room_type: z.enum(rtypes),
  city_id: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
}).refine(
  (data) => {
    if (data.room_type === "city") {
      return data.city_id != null;
    }
    return true;
  },
  { message: "Choose a city for a city room.", path: ["city_id"] },
);

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomVisibilitySchema = z.object({
  visibility: z.enum(vis),
});

export type UpdateRoomVisibilityInput = z.infer<typeof updateRoomVisibilitySchema>;
