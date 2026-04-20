import "server-only";

import { redirect } from "next/navigation";

import { getProfileForCurrentUser } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";
import {
  canModerateContent,
  isSiteOwner,
  isSiteStaff,
  siteRoleFromProfile,
  type SiteRole,
} from "@/lib/auth/site-role";

export async function requireSiteStaffPage(): Promise<{
  profile: NonNullable<Awaited<ReturnType<typeof getProfileForCurrentUser>>>;
  siteRole: SiteRole;
}> {
  const profile = await getProfileForCurrentUser();
  if (!profile) {
    redirect(ROUTES.onboarding);
  }
  const siteRole = siteRoleFromProfile(profile);
  if (!isSiteStaff(siteRole)) {
    redirect(ROUTES.home);
  }
  return { profile, siteRole };
}

export async function requireSiteOwnerPage(): Promise<{
  profile: NonNullable<Awaited<ReturnType<typeof getProfileForCurrentUser>>>;
  siteRole: SiteRole;
}> {
  const profile = await getProfileForCurrentUser();
  if (!profile) {
    redirect(ROUTES.onboarding);
  }
  const siteRole = siteRoleFromProfile(profile);
  if (!isSiteOwner(siteRole)) {
    if (isSiteStaff(siteRole)) {
      redirect(ROUTES.admin);
    }
    if (canModerateContent(siteRole)) {
      redirect(ROUTES.adminModeration);
    }
    redirect(ROUTES.home);
  }
  return { profile, siteRole };
}
