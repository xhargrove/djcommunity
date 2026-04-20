import "server-only";

import { logServerError } from "@/lib/observability/server-log";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CityRow, DjTypeRow, GenreRow } from "@/types/database";

/** Single source of truth: taxonomy lists come from Postgres only. */
export async function listCitiesOrdered(): Promise<CityRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logServerError("listCitiesOrdered", error, "database");
    return [];
  }
  return data ?? [];
}

export async function listGenresOrdered(): Promise<GenreRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("genres")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logServerError("listGenresOrdered", error, "database");
    return [];
  }
  return data ?? [];
}

export async function listDjTypesOrdered(): Promise<DjTypeRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("dj_types")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logServerError("listDjTypesOrdered", error, "database");
    return [];
  }
  return data ?? [];
}

export async function loadProfileTaxonomy() {
  const [cities, genres, djTypes] = await Promise.all([
    listCitiesOrdered(),
    listGenresOrdered(),
    listDjTypesOrdered(),
  ]);
  return { cities, genres, djTypes };
}
