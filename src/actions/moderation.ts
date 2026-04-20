"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { logServerError } from "@/lib/observability/server-log";
import {
  canModerateContent,
  siteRoleFromProfile,
} from "@/lib/auth/site-role";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusSchema = z.enum(["open", "reviewed", "dismissed"]);

const updateSchema = z.object({
  reportId: z.string().uuid(),
  status: statusSchema,
  staff_note: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((s) => (s === "" || s === undefined ? null : s)),
});

export type ModerationActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Updates report status on `content_reports` and audit fields on staff-only `content_report_triage`.
 * Authorization: session user must be moderator/admin/owner (RLS on both tables).
 */
export async function updateContentReportStatusAction(
  input: unknown,
): Promise<ModerationActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Profile required." };
  }

  if (!canModerateContent(siteRoleFromProfile(profile))) {
    return { ok: false, error: "You do not have permission to moderate." };
  }

  const supabase = await createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const reportId = parsed.data.reportId;

  const { error: statusErr } = await supabase
    .from("content_reports")
    .update({ status: parsed.data.status } as never)
    .eq("id", reportId);

  if (statusErr) {
    logServerError("updateContentReportStatusAction status", statusErr, "moderation");
    return { ok: false, error: statusErr.message };
  }

  const { error: triageErr } = await supabase
    .from("content_report_triage")
    .upsert(
      {
        report_id: reportId,
        staff_note: parsed.data.staff_note,
        reviewed_at: nowIso,
        reviewed_by_profile_id: profile.id,
      } as never,
      { onConflict: "report_id" },
    );

  if (triageErr) {
    logServerError("updateContentReportStatusAction triage", triageErr, "moderation");
    return { ok: false, error: triageErr.message };
  }

  revalidatePath(ROUTES.adminModeration);
  revalidatePath(ROUTES.adminModerationReport(reportId));
  return { ok: true };
}
