import { z } from "zod";

import { isValidHandleFormat, normalizeHandleInput } from "@/lib/profile/handle";

const linkItemSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().url().max(2000),
});

/**
 * Profile payload validated before DB write. Taxonomy IDs must exist in Postgres;
 * server actions re-verify against `cities`, `genres`, and `dj_types`.
 */
export const profilePayloadSchema = z.object({
  handle: z
    .string()
    .transform((s) => normalizeHandleInput(s))
    .refine(isValidHandleFormat, {
      message:
        "Handle must be 3–30 characters: lowercase letters, numbers, underscores; cannot start/end with underscore.",
    }),
  display_name: z.string().trim().min(1).max(120),
  bio: z.string().trim().max(2000).optional().nullable(),
  city_id: z.string().uuid("Choose a city."),
  genre_ids: z
    .array(z.string().uuid())
    .min(1, "Select at least one genre.")
    .max(24),
  dj_type_id: z.string().uuid("Choose a DJ type."),
  gear_setup: z.string().trim().max(2000).optional().nullable(),
  links: z.array(linkItemSchema).max(10),
  featured_mix_link: z
    .union([z.string().url().max(2000), z.literal(""), z.null()])
    .optional()
    .transform((v) =>
      v === "" || v === undefined || v === null ? null : v,
    ),
  booking_contact: z.string().trim().max(500).optional().nullable(),
});

export type ProfilePayload = z.infer<typeof profilePayloadSchema>;
