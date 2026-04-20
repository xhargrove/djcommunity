import { ROUTES } from "@/lib/routes";

const AUTH_PATHS = new Set<string>([ROUTES.login, ROUTES.signUp]);

/**
 * Auth-only routes (login / sign-up). Logged-in users are redirected away by middleware.
 */
export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname);
}

/**
 * Routes that require a session before the (app) layout runs.
 * Align with `src/app/(app)/*` and staff/creator surfaces so middleware applies `?next=`
 * and refreshes cookies consistently (defense in depth with RSC layout guards).
 */
export function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/u/")) {
    return false;
  }
  if (pathname === ROUTES.root) {
    return false;
  }
  if (isAuthPath(pathname)) {
    return false;
  }
  if (pathname.startsWith("/admin")) {
    return true;
  }
  if (pathname === ROUTES.creator || pathname.startsWith(`${ROUTES.creator}/`)) {
    return true;
  }
  if (
    pathname === ROUTES.home ||
    pathname.startsWith(`${ROUTES.home}/`) ||
    pathname === ROUTES.create ||
    pathname === ROUTES.explore ||
    pathname.startsWith(`${ROUTES.explore}/`) ||
    pathname === ROUTES.rooms ||
    pathname.startsWith(`${ROUTES.rooms}/`) ||
    pathname === ROUTES.notifications ||
    pathname.startsWith(`${ROUTES.notifications}/`) ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/posts") ||
    pathname === ROUTES.onboarding ||
    pathname.startsWith(`${ROUTES.onboarding}/`)
  ) {
    return true;
  }
  return false;
}
