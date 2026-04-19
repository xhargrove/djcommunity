import { z } from "zod";

export const roomMessageBodySchema = z
  .string()
  .trim()
  .min(1, "Message cannot be empty.")
  .max(4000, "Message is too long.");
