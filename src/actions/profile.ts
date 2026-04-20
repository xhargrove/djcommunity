"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { logServerError } from "@/lib/observability/server-log";
import { profilePayloadSchema, type ProfilePayload } from "@/lib/profile/schema";
import { getProfileByUserId } from "@/lib/profile/queries";
import { profilePublicPath } from "@/lib/profile/paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { Json } from "@/types/database";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

function mapUniqueViolation(message: string): string {
  if (message.includes("profiles_handle_key") || message.includes("profiles_handle")) {
    return "That handle is already taken. Choose another.";
  }
  if (message.includes("profiles_user_id")) {
    return "A profile already exists for this account.";
  }
  return "Could not save profile. Try again.";
}

async function assertValidTaxonomy(
  city_id: string,
  dj_type_id: string,
  genre_ids: string[],
): Promise<string | null> {
  const unique = [...new Set(genre_ids)];
  if (unique.length !== genre_ids.length) {
    return "Duplicate genres are not allowed.";
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: c }, { data: d }, { data: gs }] = await Promise.all([
    supabase.from("cities").select("id").eq("id", city_id).maybeSingle(),
    supabase.from("dj_types").select("id").eq("id", dj_type_id).maybeSingle(),
    supabase.from("genres").select("id").in("id", unique),
  ]);

  if (!c) {
    return "Invalid city.";
  }
  if (!d) {
    return "Invalid DJ type.";
  }
  if (!gs || gs.length !== unique.length) {
    return "One or more genres are invalid.";
  }
  return null;
}

async function syncProfileGenres(profileId: string, genreIds: string[]) {
  const supabase = await createServerSupabaseClient();
  const { error: delErr } = await supabase
    .from("profile_genres")
    .delete()
    .eq("profile_id", profileId);
  if (delErr) {
    throw new Error(delErr.message);
  }
  if (genreIds.length === 0) {
    return;
  }
  const { error: insErr } = await supabase.from("profile_genres").insert(
    genreIds.map((genre_id) => ({ profile_id: profileId, genre_id })) as never,
  );
  if (insErr) {
    throw new Error(insErr.message);
  }
}

export async function createProfileAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const parsed = profilePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const supabase = await createServerSupabaseClient();
  const existing = await getProfileByUserId(user.id);
  if (existing) {
    return { ok: false, error: "You already have a profile." };
  }

  const taxErr = await assertValidTaxonomy(
    parsed.data.city_id,
    parsed.data.dj_type_id,
    parsed.data.genre_ids,
  );
  if (taxErr) {
    return { ok: false, error: taxErr };
  }

  const row = toRow(parsed.data, user.id);
  const { data: createdRaw, error } = await supabase
    .from("profiles")
    .insert(row as never)
    .select("id")
    .single();

  const created = createdRaw as { id: string } | null;

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: mapUniqueViolation(error.message) };
    }
    logServerError("createProfile", error, "profile");
    return { ok: false, error: error.message };
  }

  if (!created?.id) {
    return { ok: false, error: "Could not create profile." };
  }

  try {
    await syncProfileGenres(created.id, parsed.data.genre_ids);
  } catch (e) {
    logServerError("syncProfileGenres", e, "profile");
    await supabase.from("profiles").delete().eq("id", created.id);
    return {
      ok: false,
      error: "Could not save genres. Try again.",
    };
  }

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.onboarding);
  revalidatePath(profilePublicPath(parsed.data.handle));
  return { ok: true };
}

export async function updateProfileAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const parsed = profilePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const supabase = await createServerSupabaseClient();
  const existing = await getProfileByUserId(user.id);
  if (!existing) {
    return { ok: false, error: "Create your profile first." };
  }

  const taxErr = await assertValidTaxonomy(
    parsed.data.city_id,
    parsed.data.dj_type_id,
    parsed.data.genre_ids,
  );
  if (taxErr) {
    return { ok: false, error: taxErr };
  }

  const oldHandle = existing.handle;
  const row = toUpdateRow(parsed.data);
  const { error } = await supabase
    .from("profiles")
    .update(row as never)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: mapUniqueViolation(error.message) };
    }
    logServerError("updateProfile", error, "profile");
    return { ok: false, error: error.message };
  }

  try {
    await syncProfileGenres(existing.id, parsed.data.genre_ids);
  } catch (e) {
    logServerError("syncProfileGenres", e, "profile");
    return { ok: false, error: "Profile saved but genres failed. Try again." };
  }

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.profileEdit);
  revalidatePath(profilePublicPath(oldHandle));
  if (parsed.data.handle !== oldHandle) {
    revalidatePath(profilePublicPath(parsed.data.handle));
  }
  return { ok: true };
}

function toRow(data: ProfilePayload, userId: string) {
  return {
    user_id: userId,
    handle: data.handle,
    display_name: data.display_name,
    bio: emptyToNull(data.bio),
    city_id: data.city_id,
    dj_type_id: data.dj_type_id,
    gear_setup: emptyToNull(data.gear_setup),
    links: data.links as unknown as Json,
    featured_mix_link: data.featured_mix_link,
    booking_contact: emptyToNull(data.booking_contact),
  };
}

function toUpdateRow(data: ProfilePayload) {
  return {
    handle: data.handle,
    display_name: data.display_name,
    bio: emptyToNull(data.bio),
    city_id: data.city_id,
    dj_type_id: data.dj_type_id,
    gear_setup: emptyToNull(data.gear_setup),
    links: data.links as unknown as Json,
    featured_mix_link: data.featured_mix_link,
    booking_contact: emptyToNull(data.booking_contact),
  };
}

function emptyToNull(s: string | null | undefined): string | null {
  if (s === undefined || s === null) {
    return null;
  }
  const t = s.trim();
  return t.length === 0 ? null : t;
}

const AVATAR_PATH = "avatar";
const BANNER_PATH = "banner";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_BANNER_BYTES = 8 * 1024 * 1024;

export async function uploadProfileAvatarAction(
  formData: FormData,
): Promise<ProfileActionResult> {
  return uploadProfileImage(formData, "avatar", "avatars", MAX_AVATAR_BYTES, "avatar_url");
}

export async function uploadProfileBannerAction(
  formData: FormData,
): Promise<ProfileActionResult> {
  return uploadProfileImage(formData, "banner", "banners", MAX_BANNER_BYTES, "banner_url");
}

async function uploadProfileImage(
  formData: FormData,
  fieldName: "avatar" | "banner",
  bucket: "avatars" | "banners",
  maxBytes: number,
  column: "avatar_url" | "banner_url",
): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image file." };
  }

  if (file.size > maxBytes) {
    return { ok: false, error: "File is too large." };
  }

  const supabase = await createServerSupabaseClient();
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "Create your profile first." };
  }

  const path = `${user.id}/${fieldName === "avatar" ? AVATAR_PATH : BANNER_PATH}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    logServerError("upload", uploadError, "storage");
    return { ok: false, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  const patch =
    column === "avatar_url"
      ? { avatar_url: publicUrl }
      : { banner_url: publicUrl };

  const { error: updateError } = await supabase
    .from("profiles")
    .update(patch as never)
    .eq("user_id", user.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath(ROUTES.profileEdit);
  revalidatePath(ROUTES.home);
  revalidatePath(profilePublicPath(profile.handle));
  return { ok: true };
}

export async function removeProfileBannerAction(): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const supabase = await createServerSupabaseClient();
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return { ok: false, error: "No profile found." };
  }

  const path = `${user.id}/${BANNER_PATH}`;
  await supabase.storage.from("banners").remove([path]);

  const { error } = await supabase
    .from("profiles")
    .update({ banner_url: null } as never)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(ROUTES.profileEdit);
  revalidatePath(profilePublicPath(profile.handle));
  return { ok: true };
}
