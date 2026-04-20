import type { ProfileRow } from "@/types/database";

/** Canonical platform roles (profiles.site_role). */
export type SiteRole = "member" | "moderator" | "admin" | "owner";

export function parseSiteRole(raw: string | null | undefined): SiteRole {
  if (raw === "moderator" || raw === "admin" || raw === "owner") {
    return raw;
  }
  return "member";
}

export function siteRoleFromProfile(profile: ProfileRow | null): SiteRole {
  if (!profile) {
    return "member";
  }
  return parseSiteRole(profile.site_role);
}

/** Platform shell (/admin, team roles): admin + owner only. */
export function isSiteStaff(role: SiteRole): boolean {
  return role === "admin" || role === "owner";
}

export function isSiteOwner(role: SiteRole): boolean {
  return role === "owner";
}

/**
 * Content moderation queue (RLS-aligned): moderator handles triage; admin/owner included.
 * Separate from room/community roles.
 */
export function canModerateContent(role: SiteRole): boolean {
  return role === "moderator" || role === "admin" || role === "owner";
}
