import { z } from "zod";

import {
  POST_TYPES_CREATABLE,
  POST_TYPES_EDITABLE,
} from "@/lib/posts/constants";
import {
  DEFAULT_MEDIA_ASPECT_RATIO,
  MEDIA_ASPECT_RATIOS,
} from "@/lib/posts/media-aspect";

export const postCaptionSchema = z
  .string()
  .trim()
  .min(1, "Write a caption.")
  .max(5000, "Caption is too long.");

/** Create flows — only creatable values (see `POST_TYPES_CREATABLE`). */
export const createPostTypeFieldSchema = z.enum(POST_TYPES_CREATABLE);

/** Update flows — all persisted values allowed for edits (see `POST_TYPES_EDITABLE`). */
export const editPostTypeFieldSchema = z.enum(POST_TYPES_EDITABLE);

export const createPostSchema = z.object({
  caption: postCaptionSchema,
  post_type: createPostTypeFieldSchema,
  media_aspect_ratio: z
    .enum(MEDIA_ASPECT_RATIOS)
    .default(DEFAULT_MEDIA_ASPECT_RATIO),
});

export const updatePostSchema = z.object({
  post_id: z.string().uuid("Invalid post."),
  caption: postCaptionSchema,
  post_type: editPostTypeFieldSchema,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
