import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { profilePublicPath } from "@/lib/profile/paths";
import { ROUTES } from "@/lib/routes";
import type { ProfileRow } from "@/types/database";

export function AppShell({
  children,
  userLabel,
  profile,
}: {
  children: React.ReactNode;
  userLabel: string;
  profile: ProfileRow | null;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6">
          <Link
            href={ROUTES.home}
            className="text-sm font-semibold tracking-tight text-[var(--foreground)] hover:text-white"
          >
            DJ Community Network
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={ROUTES.home}
              className="text-zinc-400 hover:text-white"
            >
              Home
            </Link>
            {profile ? (
              <>
                <Link
                  href={profilePublicPath(profile.handle)}
                  className="text-zinc-400 hover:text-white"
                >
                  Public profile
                </Link>
                <Link
                  href={ROUTES.profileEdit}
                  className="text-zinc-400 hover:text-white"
                >
                  Edit profile
                </Link>
              </>
            ) : (
              <Link
                href={ROUTES.onboarding}
                className="font-medium text-amber-400/90 hover:text-amber-300"
              >
                Finish profile
              </Link>
            )}
          </nav>
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="truncate text-xs text-zinc-500"
              title={userLabel}
            >
              {userLabel}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
