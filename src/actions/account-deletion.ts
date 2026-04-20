"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { isSiteStaff, siteRoleFromProfile } from "@/lib/auth/site-role";
import { logServerError } from "@/lib/observability/server-log";
import { getProfileByUserId } from "@/lib/profile/queries";
import {
  USER_ACTION_RATE,
  userActionRateLimitAllowed,
} from "@/lib/rate-limit/user-action-rate-limit";
import { ROUTES } from "@/lib/routes";
import {
  cancelAccountDeletionRequestByUser,
  insertAccountDeletionRequest,
  updateAccountDeletionRequestStaff,
} from "@/lib/supabase/account-deletion-table";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const messageSchema = z
  .string()
  .max(2000)
  .optional()
  .transform((s) => (s == null || s.trim() === "" ? null : s.trim()));

const submitSchema = z.object({
  message: messageSchema,
});

const staffStatusSchema = z.enum(["processing", "completed"]);

const staffUpdateSchema = z.object({
  requestId: z.string().uuid(),
  status: staffStatusSchema,
  staff_note: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((s) => (s === "" || s === undefined ? null : s)),
});

export type AccountDeletionActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Persists a real deletion **request** (ticket). Fulfillment remains manual — see docs/ACCOUNT_DATA_CONTROLS.md.
 */
export async function submitAccountDeletionRequestAction(
  _prev: AccountDeletionActionResult | undefined,
  formData: FormData,
): Promise<AccountDeletionActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete onboarding first." };
  }

  const parsed = submitSchema.safeParse({
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  if (
    !(await userActionRateLimitAllowed(
      user.id,
      "account_deletion:submit",
      USER_ACTION_RATE.accountDeletionRequest.max,
      USER_ACTION_RATE.accountDeletionRequest.windowMs,
    ))
  ) {
    return {
      ok: false,
      error: "Too many requests. Try again later or email support if urgent.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await insertAccountDeletionRequest(supabase, {
    user_id: user.id,
    profile_id: profile.id,
    status: "pending",
    message: parsed.data.message,
  });

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return {
        ok: false,
        error: "You already have a pending deletion request.",
      };
    }
    logServerError("submitAccountDeletionRequestAction", error, "site");
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.settingsData);
  revalidatePath(ROUTES.adminAccountDeletion);
  return { ok: true };
}

export async function cancelAccountDeletionRequestAction(
  requestId: string,
): Promise<AccountDeletionActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await cancelAccountDeletionRequestByUser(
    supabase,
    requestId,
    user.id,
  );

  if (error) {
    logServerError("cancelAccountDeletionRequestAction", error, "site");
    return { ok: false, error: (error as Error).message };
  }
  if (!data?.length) {
    return {
      ok: false,
      error: "Request not found or already processed.",
    };
  }

  revalidatePath(ROUTES.settingsData);
  revalidatePath(ROUTES.adminAccountDeletion);
  return { ok: true };
}

export async function cancelAccountDeletionFromFormAction(
  _prev: AccountDeletionActionResult | undefined,
  formData: FormData,
): Promise<AccountDeletionActionResult> {
  const raw = formData.get("requestId");
  const requestId = typeof raw === "string" ? raw : "";
  if (!requestId) {
    return { ok: false, error: "Missing request." };
  }
  return cancelAccountDeletionRequestAction(requestId);
}

export async function updateAccountDeletionRequestStaffAction(
  input: unknown,
): Promise<AccountDeletionActionResult> {
  const parsed = staffUpdateSchema.safeParse(input);
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

  if (!isSiteStaff(siteRoleFromProfile(profile))) {
    return { ok: false, error: "Admin or owner access required." };
  }

  const supabase = await createServerSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await updateAccountDeletionRequestStaff(
    supabase,
    parsed.data.requestId,
    {
      status: parsed.data.status,
      staff_note: parsed.data.staff_note,
      reviewed_at: nowIso,
      reviewed_by_profile_id: profile.id,
    },
    ["pending", "processing"],
  );

  if (error) {
    logServerError("updateAccountDeletionRequestStaffAction", error, "site");
    return { ok: false, error: (error as Error).message };
  }
  if (!data?.length) {
    return {
      ok: false,
      error: "Request not found or not in an updatable state.",
    };
  }

  revalidatePath(ROUTES.adminAccountDeletion);
  return { ok: true };
}

export async function updateAccountDeletionStaffFormAction(
  formData: FormData,
): Promise<void> {
  await updateAccountDeletionRequestStaffAction({
    requestId: String(formData.get("requestId") ?? ""),
    status: String(formData.get("status") ?? ""),
    staff_note: String(formData.get("staff_note") ?? ""),
  });
}
