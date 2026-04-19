import { z } from "zod";

import { POST_TYPES, type PostType } from "@/lib/posts/constants";

export const postCaptionSchema = z
  .string()
  .trim()
  .min(1, "Write a caption.")
  .max(5000, "Caption is too long.");

export const postTypeFieldSchema = z
  .string()
  .refine((v): v is PostType => (POST_TYPES as readonly string[]).includes(v), {
    message: "Choose a valid post type.",
  });

export const createPostSchema = z.object({
  caption: postCaptionSchema,
  post_type: postTypeFieldSchema,
});

export const updatePostSchema = z.object({
  post_id: z.string().uuid("Invalid post."),
  caption: postCaptionSchema,
  post_type: postTypeFieldSchema,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
