import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * In-process sliding-window fallback per (userId + action key).
 * When Upstash env is set, `userActionRateLimitAllowed` uses a shared Redis-backed
 * sliding window with the **same** limits and identifier shape.
 */

const buckets = new Map<string, number[]>();

export const USER_ACTION_RATE = {
  /** Creating posts (per user). */
  createPost: { max: 30, windowMs: 10 * 60 * 1000 },
  /** Room chat messages (per user per room). */
  roomMessage: { max: 50, windowMs: 60 * 1000 },
  /** Content reports (per user). */
  submitReport: { max: 25, windowMs: 60 * 60 * 1000 },
  /** Block / unblock toggles (per user). */
  blockToggle: { max: 40, windowMs: 60 * 60 * 1000 },
  /** Likes, saves, follows, comments (per user). */
  engagementToggle: { max: 120, windowMs: 60 * 1000 },
  /** Account deletion request submissions (per user). */
  accountDeletionRequest: { max: 3, windowMs: 24 * 60 * 60 * 1000 },
} as const;

let redisClient: Redis | null | undefined;
const ratelimitCache = new Map<string, Ratelimit>();
let distributedFallbackWarned = false;
/** One structured warn when production runs without Upstash (in-memory limits are not shared across instances). */
let productionWithoutDistributedWarned = false;

function getRedis(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = null;
    return null;
  }
  try {
    redisClient = Redis.fromEnv();
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

/** Maps our windowMs to @upstash/ratelimit `Duration` (fixed presets in this app). */
function windowMsToDuration(windowMs: number): Duration {
  switch (windowMs) {
    case 60 * 1000:
      return "1 m";
    case 10 * 60 * 1000:
      return "10 m";
    case 60 * 60 * 1000:
      return "60 m";
    case 24 * 60 * 60 * 1000:
      return "24 h";
    default: {
      const sec = Math.max(1, Math.round(windowMs / 1000));
      return `${sec} s`;
    }
  }
}

function getDistributedLimiter(max: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  const cacheKey = `${max}:${windowMs}`;
  let lim = ratelimitCache.get(cacheKey);
  if (lim) {
    return lim;
  }
  const duration = windowMsToDuration(windowMs);
  lim = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, duration),
    prefix: `djcn:rl:${max}:${windowMs}`,
  });
  ratelimitCache.set(cacheKey, lim);
  return lim;
}

function maybeWarnProductionWithoutDistributedBackend(): void {
  if (productionWithoutDistributedWarned) {
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }
  productionWithoutDistributedWarned = true;
  console.warn(
    JSON.stringify({
      level: "warn",
      source: "djcn",
      context: "userActionRateLimit",
      detail:
        "production_using_in_memory_rate_limits_configure_upstash_for_multi_instance",
    }),
  );
}

/**
 * Synchronous in-memory check — used as fallback and in unit tests.
 * @returns true if allowed, false if rate limited.
 */
export function checkUserActionRateLimit(
  userId: string,
  actionKey: string,
  max: number,
  windowMs: number,
): boolean {
  const key = `${actionKey}:${userId}`;
  const now = Date.now();
  const cutoff = now - windowMs;
  let hits = buckets.get(key) ?? [];
  hits = hits.filter((t) => t > cutoff);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

/**
 * Distributed when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set;
 * otherwise in-memory only. On Upstash failure, falls back once-warned to memory.
 */
export async function userActionRateLimitAllowed(
  userId: string,
  actionKey: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const identifier = `${userId}:${actionKey}`;
  const limiter = getDistributedLimiter(max, windowMs);
  if (!limiter) {
    maybeWarnProductionWithoutDistributedBackend();
    return checkUserActionRateLimit(userId, actionKey, max, windowMs);
  }
  try {
    const { success } = await limiter.limit(identifier);
    return success;
  } catch {
    if (!distributedFallbackWarned) {
      distributedFallbackWarned = true;
      console.warn(
        JSON.stringify({
          level: "warn",
          source: "djcn",
          context: "userActionRateLimit",
          detail: "upstash_unavailable_using_memory_fallback",
        }),
      );
    }
    return checkUserActionRateLimit(userId, actionKey, max, windowMs);
  }
}
