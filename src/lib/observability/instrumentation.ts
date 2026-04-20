import "server-only";

const DEFAULT_SLOW_MS = 2000;

/**
 * Optional timing hook for server actions / route handlers. Off by default to avoid noise;
 * enable with `DJCN_LOG_SERVER_ACTION_TIMING=true` or by setting `DJCN_SLOW_ACTION_MS`.
 *
 * Does not replace APM — see `docs/OBSERVABILITY.md`.
 */
export function reportServerActionDuration(
  name: string,
  startedAtMs: number,
  options?: { slowMs?: number },
): void {
  const ms = Math.round(performance.now() - startedAtMs);
  const configuredSlow = process.env.DJCN_SLOW_ACTION_MS;
  const slowThreshold =
    options?.slowMs ??
    (configuredSlow != null && configuredSlow !== ""
      ? Number(configuredSlow)
      : DEFAULT_SLOW_MS);
  const logAll = process.env.DJCN_LOG_SERVER_ACTION_TIMING === "true";

  if (!logAll && !(Number.isFinite(slowThreshold) && ms >= slowThreshold)) {
    return;
  }

  console.info(
    JSON.stringify({
      level: "info",
      source: "djcn",
      context: "server_action_timing",
      name,
      ms,
      ...(Number.isFinite(slowThreshold) && ms >= slowThreshold
        ? { slow: true as const }
        : {}),
    }),
  );
}
