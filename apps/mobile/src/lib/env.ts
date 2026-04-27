import { z } from "zod";

const jwtLike = z
  .string()
  .min(20)
  .refine((value) => value.split(".").length === 3, {
    message: "Must be a JWT with three segments",
  });

const publicEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), {
      message: "EXPO_PUBLIC_SUPABASE_URL must use https",
    }),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: jwtLike,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Same values as the Next.js app (`NEXT_PUBLIC_SUPABASE_*`), using Expo's
 * `EXPO_PUBLIC_*` prefix so Metro inlines them at build time.
 */
export function parsePublicEnv():
  | { ok: true; data: PublicEnv }
  | { ok: false; message: string } {
  const parsed = publicEnvSchema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return { ok: false, message };
  }

  return { ok: true, data: parsed.data };
}
