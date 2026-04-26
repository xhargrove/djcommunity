"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const kindSchema = z.enum(["mashup", "mixtape", "other"]);

const submitSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((s) => (s == null || s.trim() === "" ? null : s.trim())),
  download_url: z
    .string()
    .trim()
    .url("Enter a valid URL.")
    .refine((u) => u.startsWith("https://"), "Link must use https://"),
  kind: kindSchema,
});

export type MashupMixtapeActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitMashupMixtapeAction(
  _prev: MashupMixtapeActionResult | undefined,
  formData: FormData,
): Promise<MashupMixtapeActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Complete onboarding first." };
  }

  const rawKind = String(formData.get("kind") ?? "");
  const parsed = submitSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    download_url: String(formData.get("download_url") ?? ""),
    kind: rawKind === "mashup" || rawKind === "mixtape" || rawKind === "other" ? rawKind : "mixtape",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("mashup_mixtape_posts").insert({
    profile_id: profile.id,
    title: parsed.data.title,
    description: parsed.data.description,
    download_url: parsed.data.download_url,
    kind: parsed.data.kind,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.mashupsMixtapes);
  return { ok: true };
}
