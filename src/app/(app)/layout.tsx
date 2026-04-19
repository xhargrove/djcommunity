import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

export default async function AppRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `${ROUTES.login}?next=${encodeURIComponent(ROUTES.home)}`,
    );
  }

  const userLabel = user.email ?? user.id;
  const profile = await getProfileByUserId(user.id);

  return (
    <AppShell userLabel={userLabel} profile={profile}>
      {children}
    </AppShell>
  );
}
