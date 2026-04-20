import { describe, expect, it } from "vitest";

import {
  checkUserActionRateLimit,
  USER_ACTION_RATE,
} from "@/lib/rate-limit/user-action-rate-limit";

describe("checkUserActionRateLimit", () => {
  it("allows up to max hits within the window", () => {
    const uid = "user-a";
    const key = "test:action";
    const { max, windowMs } = { max: 3, windowMs: 60_000 };
    expect(checkUserActionRateLimit(uid, key, max, windowMs)).toBe(true);
    expect(checkUserActionRateLimit(uid, key, max, windowMs)).toBe(true);
    expect(checkUserActionRateLimit(uid, key, max, windowMs)).toBe(true);
    expect(checkUserActionRateLimit(uid, key, max, windowMs)).toBe(false);
  });

  it("isolates users and action keys", () => {
    expect(
      checkUserActionRateLimit("u1", "a", USER_ACTION_RATE.createPost.max, 60_000),
    ).toBe(true);
    expect(
      checkUserActionRateLimit("u2", "a", USER_ACTION_RATE.createPost.max, 60_000),
    ).toBe(true);
    expect(
      checkUserActionRateLimit("u1", "b", USER_ACTION_RATE.createPost.max, 60_000),
    ).toBe(true);
  });
});
