import { redirect } from "next/navigation";

import { NotificationList } from "@/components/notifications/notification-list";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications/queries";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const items = await listNotifications(profile.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <AppPageHeader
        eyebrow="Signals"
        title="Notifications"
        subtitle="Likes, comments, follows, and room activity that pull you back into the scene."
      />

      <NotificationList items={items} />
    </div>
  );
}
