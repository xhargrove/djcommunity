import { z } from "zod";

export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Write a comment.")
  .max(2000, "Comment is too long.");
