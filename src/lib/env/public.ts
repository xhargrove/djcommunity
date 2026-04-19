import { z } from "zod";

const jwtLike = z
  .string()
  .min(20)
  .refine((value) => value.split(".").length === 3, {
    message: "Must be a JWT with three segments",
  });

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), {
      message: "NEXT_PUBLIC_SUPABASE_URL must use https",
    }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jwtLike,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedPublic: PublicEnv | null = null;

/**
 * Validated public env (safe to use in browser and server).
 * Throws if required variables are missing or malformed.
 */
export function getPublicEnv(): PublicEnv {
  if (cachedPublic) {
    return cachedPublic;
  }

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid public environment: ${message}`);
  }

  cachedPublic = parsed.data;
  return parsed.data;
}

/** Server instrumentation hook — validates public env on Node startup. */
export function assertPublicEnv(): void {
  getPublicEnv();
}
