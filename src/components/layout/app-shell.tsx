import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { MobileTabNav } from "@/components/layout/mobile-tab-nav";
import { profilePublicPath } from "@/lib/profile/paths";
import {
  canModerateContent,
  isSiteStaff,
  siteRoleFromProfile,
} from "@/lib/auth/site-role";
import { ROUTES } from "@/lib/routes";
import type { ProfileRow } from "@/types/database";

const mainBottomPad =
  "pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]";

export function AppShell({
  children,
  userLabel,
  profile,
  unreadNotificationCount = 0,
}: {
  children: React.ReactNode;
  userLabel: string;
  profile: ProfileRow | null;
  unreadNotificationCount?: number;
}) {
  const profileHref = profile
    ? profilePublicPath(profile.handle)
    : ROUTES.onboarding;
  const profileActivePaths = profile
    ? [profilePublicPath(profile.handle), ROUTES.profileEdit]
    : [ROUTES.onboarding];
  const siteRole = profile ? siteRoleFromProfile(profile) : null;
  const showAdmin = siteRole !== null && isSiteStaff(siteRole);
  const showModeration = siteRole !== null && canModerateContent(siteRole);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-200/90 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href={ROUTES.home}
              className="shrink-0 bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-sm font-bold tracking-tight text-transparent hover:from-amber-500 hover:to-amber-700"
            >
              MixerHQ
            </Link>
            <nav className="flex min-w-0 items-center gap-2 overflow-x-auto text-[11px] font-medium text-zinc-600 sm:gap-3 sm:text-xs">
              <Link href={ROUTES.home} className="shrink-0 hover:text-zinc-900">
                Home
              </Link>
              <Link href={ROUTES.explore} className="shrink-0 hover:text-zinc-900">
                Explore
              </Link>
              <Link
                href={ROUTES.mashupsMixtapes}
                className="shrink-0 hover:text-amber-900"
                title="Mashups & Mixtapes"
              >
                <span className="sm:hidden">Mixtapes</span>
                <span className="hidden sm:inline">Mashups & Mixtapes</span>
              </Link>
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {showModeration ? (
              <Link
                href={ROUTES.adminModeration}
                className="hidden rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 sm:inline-flex"
              >
                Moderation
              </Link>
            ) : null}
            {showAdmin ? (
              <Link
                href={ROUTES.admin}
                className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950 transition hover:bg-amber-100 sm:inline-flex"
              >
                Admin
              </Link>
            ) : null}
            <Link
              href={ROUTES.notifications}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <span>Alerts</span>
              {unreadNotificationCount > 0 ? (
                <span
                  className="min-w-[1.1rem] rounded-full bg-amber-500 px-1.5 text-center text-[10px] font-semibold leading-tight text-white"
                  aria-label={`${unreadNotificationCount} unread`}
                >
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              ) : null}
            </Link>
            <span
              className="hidden max-w-[10rem] truncate text-xs text-zinc-500 md:inline"
              title={userLabel}
            >
              {userLabel}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main
        className={`mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-6 sm:px-6 ${mainBottomPad}`}
      >
        {children}
      </main>
      <MobileTabNav
        profileHref={profileHref}
        profileActivePaths={profileActivePaths}
      />
    </div>
  );
}
