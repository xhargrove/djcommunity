import "server-only";

import { logServerError } from "@/lib/observability/server-log";
import { getCurrentUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

export async function getProfileForCurrentUser(): Promise<ProfileRow | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return getProfileByUserId(user.id);
}

export async function getProfileByUserId(
  userId: string,
): Promise<ProfileRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logServerError("getProfileByUserId", error, "profile");
    return null;
  }

  return data;
}

export async function getProfileByHandle(
  handle: string,
): Promise<ProfileRow | null> {
  const normalized = handle.trim().toLowerCase();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", normalized)
    .maybeSingle();

  if (error) {
    logServerError("getProfileByHandle", error, "profile");
    return null;
  }

  return data;
}

export async function getGenreIdsForProfile(
  profileId: string,
): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profile_genres")
    .select("genre_id")
    .eq("profile_id", profileId);

  if (error) {
    logServerError("getGenreIdsForProfile", error, "profile");
    return [];
  }

  const rows = data as { genre_id: string }[] | null;
  return rows?.map((r) => r.genre_id) ?? [];
}

export type ProfilePublicView = {
  profile: ProfileRow;
  cityName: string;
  djTypeLabel: string;
  genres: { id: string; label: string; slug: string }[];
};

export async function getProfilePublicViewByHandle(
  handle: string,
): Promise<ProfilePublicView | null> {
  const profile = await getProfileByHandle(handle);
  if (!profile) {
    return null;
  }

  const supabase = await createServerSupabaseClient();

  const [{ data: cityRaw }, { data: djRaw }, pgRes] = await Promise.all([
    supabase.from("cities").select("name").eq("id", profile.city_id).maybeSingle(),
    supabase.from("dj_types").select("label").eq("id", profile.dj_type_id).maybeSingle(),
    supabase.from("profile_genres").select("genre_id").eq("profile_id", profile.id),
  ]);

  const city = cityRaw as { name: string } | null;
  const dj = djRaw as { label: string } | null;
  const pgRows = pgRes.data as { genre_id: string }[] | null;
  const genreIds = pgRows?.map((r) => r.genre_id) ?? [];
  const { data: genreRowsRaw } =
    genreIds.length > 0
      ? await supabase
          .from("genres")
          .select("id, label, slug")
          .in("id", genreIds)
          .order("sort_order", { ascending: true })
      : { data: [] as { id: string; label: string; slug: string }[] };

  const genreRows = genreRowsRaw as { id: string; label: string; slug: string }[];

  return {
    profile,
    cityName: city?.name ?? "",
    djTypeLabel: dj?.label ?? "",
    genres: genreRows.map((g) => ({
      id: g.id,
      label: g.label,
      slug: g.slug,
    })),
  };
}
