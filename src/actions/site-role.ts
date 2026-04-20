"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { logServerError } from "@/lib/observability/server-log";
import { siteRoleFromProfile, type SiteRole } from "@/lib/auth/site-role";
import { ROUTES } from "@/lib/routes";
import { getProfileByUserId, getProfileByHandle } from "@/lib/profile/queries";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const roleSchema = z.enum(["member", "moderator", "admin", "owner"]);

const payloadSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .transform((s) => s.toLowerCase()),
  site_role: roleSchema,
});

export type SiteRoleActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function countOwners(): Promise<number> {
  const service = createServiceSupabaseClient();
  const { count, error } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("site_role", "owner");
  if (error) {
    logServerError("countOwners", error, "site");
    return 0;
  }
  return count ?? 0;
}

/**
 * Platform owners assign admin/owner/member. Uses service role after session checks.
 */
export async function setProfileSiteRoleAction(
  input: unknown,
): Promise<SiteRoleActionResult> {
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const actor = await getProfileByUserId(user.id);
  if (!actor) {
    return { ok: false, error: "Profile required." };
  }

  if (siteRoleFromProfile(actor) !== "owner") {
    return { ok: false, error: "Only a platform owner can change site roles." };
  }

  const target = await getProfileByHandle(parsed.data.handle);
  if (!target) {
    return { ok: false, error: "No profile with that handle." };
  }

  const nextRole: SiteRole = parsed.data.site_role;
  const prevRole = siteRoleFromProfile(target);

  if (prevRole === nextRole) {
    return { ok: true };
  }

  const owners = await countOwners();
  if (prevRole === "owner" && nextRole !== "owner" && owners <= 1) {
    return {
      ok: false,
      error: "Cannot remove the last platform owner. Promote another owner first.",
    };
  }

  const service = createServiceSupabaseClient();
  const { error } = await service
    .from("profiles")
    .update({ site_role: nextRole } as never)
    .eq("id", target.id);

  if (error) {
    logServerError("setProfileSiteRoleAction", error, "site");
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.admin);
  revalidatePath(ROUTES.adminTeam);
  revalidatePath(ROUTES.adminModeration);
  revalidatePath(ROUTES.home);
  return { ok: true };
}
