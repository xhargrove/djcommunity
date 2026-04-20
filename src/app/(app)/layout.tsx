import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getSafeRedirectTarget } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrivateRouteRobots } from "@/lib/meta/indexing";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  return { robots: getPrivateRouteRobots() };
}

async function loginRedirectFromRequest(): Promise<never> {
  // `next-url` is set by Next.js App Router; fallback keeps legacy behavior.
  const h = await headers();
  const nextUrl = h.get("next-url");
  let safeNext: string = ROUTES.home;
  if (nextUrl) {
    try {
      const { pathname, search } = new URL(nextUrl, "https://local.invalid");
      safeNext = getSafeRedirectTarget(`${pathname}${search}`, ROUTES.home);
    } catch {
      safeNext = ROUTES.home;
    }
  }
  redirect(`${ROUTES.login}?next=${encodeURIComponent(safeNext)}`);
}

export default async function AppRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return loginRedirectFromRequest();
  }

  const userLabel = user.email ?? user.id;
  const profile = await getProfileByUserId(user.id);
  const unreadNotificationCount = profile
    ? await getUnreadNotificationCount(profile.id)
    : 0;

  return (
    <AppShell
      userLabel={userLabel}
      profile={profile}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}
