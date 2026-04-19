import { ROUTES } from "@/lib/routes";

/**
 * Returns a safe same-origin path for post-login redirect.
 * Rejects open redirects and non-path values.
 */
export function getSafeRedirectTarget(
  nextParam: string | string[] | undefined,
  fallback: string = ROUTES.home,
): string {
  const raw = Array.isArray(nextParam) ? nextParam[0] : nextParam;
  if (!raw || typeof raw !== "string") {
    return fallback;
  }

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return fallback;
  }

  return decoded;
}
