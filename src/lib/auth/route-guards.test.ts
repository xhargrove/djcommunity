import { describe, expect, it } from "vitest";

import { isAuthPath, isProtectedPath } from "@/lib/auth/route-guards";
import { ROUTES } from "@/lib/routes";

describe("isAuthPath", () => {
  it("matches login and sign-up only", () => {
    expect(isAuthPath(ROUTES.login)).toBe(true);
    expect(isAuthPath(ROUTES.signUp)).toBe(true);
    expect(isAuthPath("/home")).toBe(false);
  });
});

describe("isProtectedPath", () => {
  it("treats marketing root and public profiles as public", () => {
    expect(isProtectedPath(ROUTES.root)).toBe(false);
    expect(isProtectedPath("/u/somehandle")).toBe(false);
  });

  it("protects app shell routes", () => {
    expect(isProtectedPath(ROUTES.home)).toBe(true);
    expect(isProtectedPath(ROUTES.create)).toBe(true);
    expect(isProtectedPath(ROUTES.explore)).toBe(true);
    expect(isProtectedPath("/explore/nyc")).toBe(true);
    expect(isProtectedPath(ROUTES.rooms)).toBe(true);
    expect(isProtectedPath("/rooms/new")).toBe(true);
    expect(isProtectedPath(ROUTES.notifications)).toBe(true);
    expect(isProtectedPath("/profile/edit")).toBe(true);
    expect(isProtectedPath("/posts/x/edit")).toBe(true);
    expect(isProtectedPath(ROUTES.onboarding)).toBe(true);
  });

  it("protects staff and creator surfaces for consistent middleware redirects", () => {
    expect(isProtectedPath(ROUTES.admin)).toBe(true);
    expect(isProtectedPath(ROUTES.adminTeam)).toBe(true);
    expect(isProtectedPath(ROUTES.adminModeration)).toBe(true);
    expect(isProtectedPath(ROUTES.creator)).toBe(true);
  });

  it("does not protect auth routes", () => {
    expect(isProtectedPath(ROUTES.login)).toBe(false);
    expect(isProtectedPath(ROUTES.signUp)).toBe(false);
  });
});
