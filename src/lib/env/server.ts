import "server-only";
import { z } from "zod";

const jwtLike = z
  .string()
  .min(20)
  .refine((value) => value.split(".").length === 3, {
    message: "Must be a JWT with three segments",
  });

const serverEnvSchema = z.object({
  /**
   * Optional until server-side admin operations are implemented.
   * Never import this from client bundles.
   */
  SUPABASE_SERVICE_ROLE_KEY: jwtLike.optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServer: ServerEnv | null = null;

/**
 * Server-only env. Does not include NEXT_PUBLIC_* — use getPublicEnv() for those.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServer) {
    return cachedServer;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${message}`);
  }

  cachedServer = parsed.data;
  return parsed.data;
}

export function assertServerEnv(): void {
  getServerEnv();
}
