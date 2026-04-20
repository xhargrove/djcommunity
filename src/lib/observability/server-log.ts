import "server-only";

/**
 * Trusted server logging — no user content, emails, or tokens.
 * Production: single-line JSON for log drains (Vercel, Datadog, CloudWatch, etc.).
 * Categories help operators filter without building a second logging pipeline.
 */

/** Actionable groupings for operators (not HTTP codes). */
export type LogErrorCategory =
  | "auth"
  | "database"
  | "storage"
  | "moderation"
  | "rate_limit"
  | "engagement"
  | "rooms"
  | "profile"
  | "notifications"
  | "discovery"
  | "site"
  | "unknown";

function serializeError(err: unknown): { name: string; message: string } {
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { name: "Unknown", message: String(err) };
}

export function logServerError(
  context: string,
  err: unknown,
  category: LogErrorCategory = "unknown",
): void {
  const { name, message } = serializeError(err);
  const payload = {
    level: "error" as const,
    source: "djcn",
    category,
    context,
    name,
    message,
  };
  if (process.env.NODE_ENV === "production") {
    console.error(JSON.stringify(payload));
  } else {
    console.error(`[djcn] ${context}`, payload, err);
  }
}

export function logServerWarning(context: string, detail: string): void {
  console.warn(
    JSON.stringify({
      level: "warn",
      source: "djcn",
      context,
      detail,
    }),
  );
}
