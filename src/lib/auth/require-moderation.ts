import "server-only";

import { redirect } from "next/navigation";

import {
  canModerateContent,
  siteRoleFromProfile,
  type SiteRole,
} from "@/lib/auth/site-role";
import { getProfileForCurrentUser } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

/**
 * Server-only guard for moderation routes. Enforced again by Supabase RLS for staff roles.
 */
export async function requireCanModeratePage(): Promise<{
  profile: NonNullable<Awaited<ReturnType<typeof getProfileForCurrentUser>>>;
  siteRole: SiteRole;
}> {
  const profile = await getProfileForCurrentUser();
  if (!profile) {
    redirect(ROUTES.onboarding);
  }
  const siteRole = siteRoleFromProfile(profile);
  if (!canModerateContent(siteRole)) {
    redirect(ROUTES.home);
  }
  return { profile, siteRole };
}
