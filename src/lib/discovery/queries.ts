import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** Typed RPC helpers until generated DB types fully wire `Functions` for SSR client. */
async function rpcUuidArray(
  supabase: SupabaseServer,
  fn: string,
  args: Record<string, unknown>,
): Promise<{ data: string[] | null; error: { message: string } | null }> {
  const res = await (
    supabase as unknown as {
      rpc: (
        name: string,
        params: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc(fn, args);
  const data = Array.isArray(res.data)
    ? (res.data as string[])
    : null;
  return { data, error: res.error };
}
import type { RoomListItem } from "@/lib/rooms/queries";
import { listFeedPostsByIds } from "@/lib/posts/queries";
import type { FeedItem } from "@/lib/posts/queries";
import type {
  CityRow,
  DjTypeRow,
  GenreRow,
  ProfileRow,
  RoomRow,
} from "@/types/database";

/** Strip `%` / `_` wildcards and cap length so user search stays predictable. */
export function sanitizeDiscoveryQuery(q: string, maxLen = 80): string {
  return q.trim().replace(/[%_]/g, " ").slice(0, maxLen);
}

export type TaxonomyFilters = {
  cities: Pick<CityRow, "id" | "slug" | "name" | "sort_order">[];
  genres: Pick<GenreRow, "id" | "slug" | "label" | "sort_order">[];
  djTypes: Pick<DjTypeRow, "id" | "slug" | "label" | "sort_order">[];
};

export async function listTaxonomyForFilters(): Promise<TaxonomyFilters> {
  const supabase = await createServerSupabaseClient();
  const [cities, genres, djTypes] = await Promise.all([
    supabase
      .from("cities")
      .select("id, slug, name, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("genres")
      .select("id, slug, label, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("dj_types")
      .select("id, slug, label, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  return {
    cities: (cities.data ?? []) as TaxonomyFilters["cities"],
    genres: (genres.data ?? []) as TaxonomyFilters["genres"],
    djTypes: (djTypes.data ?? []) as TaxonomyFilters["djTypes"],
  };
}

export async function getCityBySlug(slug: string): Promise<CityRow | null> {
  const normalized = slug.trim().toLowerCase();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    console.error("getCityBySlug", error);
    return null;
  }
  return data as CityRow | null;
}

export async function resolveTaxonomyIdsFromSlugs(params: {
  citySlug?: string | null;
  genreSlug?: string | null;
  djTypeSlug?: string | null;
}): Promise<{
  cityId: string | null;
  genreId: string | null;
  djTypeId: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const [cityRes, genreRes, djRes] = await Promise.all([
    params.citySlug
      ? supabase
          .from("cities")
          .select("id")
          .eq("slug", params.citySlug.trim().toLowerCase())
          .maybeSingle()
      : Promise.resolve({ data: null }),
    params.genreSlug
      ? supabase
          .from("genres")
          .select("id")
          .eq("slug", params.genreSlug.trim().toLowerCase())
          .maybeSingle()
      : Promise.resolve({ data: null }),
    params.djTypeSlug
      ? supabase
          .from("dj_types")
          .select("id")
          .eq("slug", params.djTypeSlug.trim().toLowerCase())
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    cityId: (cityRes.data as { id: string } | null)?.id ?? null,
    genreId: (genreRes.data as { id: string } | null)?.id ?? null,
    djTypeId: (djRes.data as { id: string } | null)?.id ?? null,
  };
}

export async function searchProfiles(opts: {
  q: string;
  cityId: string | null;
  genreId: string | null;
  djTypeId: string | null;
  limit: number;
}): Promise<ProfileRow[]> {
  const supabase = await createServerSupabaseClient();
  let allowedIds: string[] | null = null;
  if (opts.genreId) {
    const { data: pg } = await supabase
      .from("profile_genres")
      .select("profile_id")
      .eq("genre_id", opts.genreId);
    const pgRows = (pg ?? []) as { profile_id: string }[];
    allowedIds = [...new Set(pgRows.map((r) => r.profile_id))];
    if (allowedIds.length === 0) {
      return [];
    }
  }

  let rq = supabase.from("profiles").select("*");
  if (allowedIds) {
    rq = rq.in("id", allowedIds);
  }
  if (opts.cityId) {
    rq = rq.eq("city_id", opts.cityId);
  }
  if (opts.djTypeId) {
    rq = rq.eq("dj_type_id", opts.djTypeId);
  }
  const safe = sanitizeDiscoveryQuery(opts.q);
  if (safe.length > 0) {
    const pat = `%${safe}%`;
    rq = rq.or(`handle.ilike.${pat},display_name.ilike.${pat}`);
  }

  const { data, error } = await rq
    .order("created_at", { ascending: false })
    .limit(opts.limit);

  if (error) {
    console.error("searchProfiles", error);
    return [];
  }
  return (data ?? []) as ProfileRow[];
}

export async function searchRooms(opts: {
  q: string;
  cityId: string | null;
  viewerProfileId: string | null;
  limit: number;
}): Promise<RoomListItem[]> {
  const supabase = await createServerSupabaseClient();
  const safe = sanitizeDiscoveryQuery(opts.q);
  const pattern = safe.length > 0 ? `%${safe}%` : null;

  const fetchPublic = async (): Promise<RoomRow[]> => {
    let q = supabase.from("rooms").select("*").eq("visibility", "public");
    if (opts.cityId) {
      q = q.eq("city_id", opts.cityId);
    }
    if (pattern) {
      q = q.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
    }
    const { data, error } = await q
      .order("member_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(opts.limit);
    if (error) {
      console.error("searchRooms public", error);
      return [];
    }
    return (data ?? []) as RoomRow[];
  };

  const fetchPrivateMine = async (): Promise<RoomRow[]> => {
    if (!opts.viewerProfileId) {
      return [];
    }
    const { data: mships } = await supabase
      .from("room_memberships")
      .select("room_id")
      .eq("profile_id", opts.viewerProfileId);
    const mRows = (mships ?? []) as { room_id: string }[];
    const roomIds = [...new Set(mRows.map((m) => m.room_id))];
    if (roomIds.length === 0) {
      return [];
    }
    let q = supabase
      .from("rooms")
      .select("*")
      .in("id", roomIds)
      .eq("visibility", "private");
    if (opts.cityId) {
      q = q.eq("city_id", opts.cityId);
    }
    if (pattern) {
      q = q.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
    }
    const { data, error } = await q
      .order("member_count", { ascending: false })
      .limit(opts.limit);
    if (error) {
      console.error("searchRooms private", error);
      return [];
    }
    return (data ?? []) as RoomRow[];
  };

  const [pub, priv] = await Promise.all([fetchPublic(), fetchPrivateMine()]);
  const merged = new Map<string, RoomRow>();
  for (const r of pub) {
    merged.set(r.id, r);
  }
  for (const r of priv) {
    merged.set(r.id, r);
  }
  const rows = [...merged.values()].slice(0, opts.limit);

  if (rows.length === 0) {
    return [];
  }

  const creatorIds = [...new Set(rows.map((r) => r.created_by_profile_id))];
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, handle")
    .in("id", creatorIds);
  const handleMap = new Map(
    ((creators ?? []) as Pick<ProfileRow, "id" | "handle">[]).map((p) => [
      p.id,
      p.handle,
    ]),
  );

  return rows.map((r) => ({
    ...r,
    creator_handle: handleMap.get(r.created_by_profile_id) ?? null,
  }));
}

async function searchPostIdsByCaption(opts: {
  q: string;
  limit: number;
}): Promise<string[]> {
  const safe = sanitizeDiscoveryQuery(opts.q);
  if (safe.length === 0) {
    return [];
  }
  const pat = `%${safe}%`;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .ilike("caption", pat)
    .order("created_at", { ascending: false })
    .limit(opts.limit);

  if (error) {
    console.error("searchPostIdsByCaption", error);
    return [];
  }
  return (data ?? []).map((r) => (r as { id: string }).id);
}

/** Caption search with optional taxonomy filters on the author (canonical joins). */
export async function searchPostsForDiscovery(opts: {
  q: string;
  cityId: string | null;
  genreId: string | null;
  djTypeId: string | null;
  limit: number;
  viewerProfileId: string | null;
}): Promise<FeedItem[]> {
  const safe = sanitizeDiscoveryQuery(opts.q);
  if (safe.length === 0) {
    return [];
  }

  const candidateIds = await searchPostIdsByCaption({
    q: opts.q,
    limit: Math.min(60, opts.limit * 4),
  });
  if (candidateIds.length === 0) {
    return [];
  }

  let feed = await listFeedPostsByIds(candidateIds, opts.viewerProfileId);
  if (
    !opts.cityId &&
    !opts.genreId &&
    !opts.djTypeId
  ) {
    return feed.slice(0, opts.limit);
  }

  const supabase = await createServerSupabaseClient();
  const authorIds = [...new Set(feed.map((f) => f.post.profile_id))];

  const [{ data: profs }, { data: genreRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, city_id, dj_type_id")
      .in("id", authorIds),
    opts.genreId
      ? supabase
          .from("profile_genres")
          .select("profile_id")
          .eq("genre_id", opts.genreId)
          .in("profile_id", authorIds)
      : Promise.resolve({ data: null as { profile_id: string }[] | null }),
  ]);

  const profileRows = (profs ?? []) as Pick<
    ProfileRow,
    "id" | "city_id" | "dj_type_id"
  >[];
  const cityDjMap = new Map(
    profileRows.map((p) => [p.id, { city: p.city_id, dj: p.dj_type_id }]),
  );
  const genreAllow = opts.genreId
    ? new Set((genreRows ?? []).map((r) => r.profile_id))
    : null;

  feed = feed.filter((f) => {
    const pid = f.post.profile_id;
    if (opts.cityId) {
      const c = cityDjMap.get(pid)?.city;
      if (c !== opts.cityId) {
        return false;
      }
    }
    if (opts.djTypeId) {
      const d = cityDjMap.get(pid)?.dj;
      if (d !== opts.djTypeId) {
        return false;
      }
    }
    if (genreAllow && !genreAllow.has(pid)) {
      return false;
    }
    return true;
  });

  return feed.slice(0, opts.limit);
}

export async function discoveryTrendingFeed(
  viewerProfileId: string | null,
  limit = 15,
): Promise<FeedItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data: ids, error } = await rpcUuidArray(supabase, "discovery_trending_post_ids", {
    p_days: 7,
    p_limit: limit,
  });
  if (error) {
    console.error("discovery_trending_post_ids", error);
    return [];
  }
  const postIds = ids ?? [];
  return listFeedPostsByIds(postIds, viewerProfileId);
}

export async function discoveryTrendingFeedForCity(
  cityId: string,
  viewerProfileId: string | null,
  limit = 15,
): Promise<FeedItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data: ids, error } = await rpcUuidArray(
    supabase,
    "discovery_trending_post_ids_for_city",
    { p_city_id: cityId, p_days: 7, p_limit: limit },
  );
  if (error) {
    console.error("discovery_trending_post_ids_for_city", error);
    return [];
  }
  const postIds = ids ?? [];
  return listFeedPostsByIds(postIds, viewerProfileId);
}

export async function discoveryRisingProfiles(
  cityId: string | null,
  limit = 12,
): Promise<ProfileRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data: ids, error } = await rpcUuidArray(
    supabase,
    "discovery_rising_profile_ids",
    {
      p_scope_city_id: cityId,
      p_days: 14,
      p_limit: limit,
    },
  );
  if (error) {
    console.error("discovery_rising_profile_ids", error);
    return [];
  }
  const list = ids ?? [];
  if (list.length === 0) {
    return [];
  }
  const { data: profs, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", list);
  if (pErr || !profs) {
    console.error("discoveryRisingProfiles profiles", pErr);
    return [];
  }
  const rows = (profs ?? []) as ProfileRow[];
  const orderMap = new Map(list.map((id, i) => [id, i] as const));
  rows.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
  );
  return rows;
}

export async function suggestRooms(
  cityId: string | null,
  viewerProfileId: string | null,
  limit = 12,
): Promise<RoomListItem[]> {
  return searchRooms({
    q: "",
    cityId,
    viewerProfileId,
    limit,
  });
}
