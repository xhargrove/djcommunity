"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { logServerError } from "@/lib/observability/server-log";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function markNotificationReadFormAction(
  formData: FormData,
): Promise<void> {
  const notificationId = String(formData.get("id") ?? "");
  if (!notificationId) {
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    return;
  }
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() } as never)
    .eq("id", notificationId)
    .eq("recipient_profile_id", profile.id)
    .is("read_at", null);

  if (error) {
    logServerError("markNotificationReadFormAction", error, "notifications");
    return;
  }

  revalidatePath("/", "layout");
  revalidatePath(ROUTES.notifications);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    return;
  }
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() } as never)
    .eq("recipient_profile_id", profile.id)
    .is("read_at", null);

  if (error) {
    logServerError("markAllNotificationsReadAction", error, "notifications");
    return;
  }

  revalidatePath("/", "layout");
  revalidatePath(ROUTES.notifications);
}
