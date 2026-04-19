-- Phase 8: Discovery & search — indexes + real-signal ranking helpers

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Profile filters & text search (canonical city_id / dj_type_id + genres via profile_genres)
CREATE INDEX IF NOT EXISTS profiles_city_dj_type_idx
  ON public.profiles (city_id, dj_type_id);

CREATE INDEX IF NOT EXISTS profiles_display_name_trgm_idx
  ON public.profiles USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS profiles_handle_trgm_idx
  ON public.profiles USING gin (handle gin_trgm_ops);

-- Rooms discovery / search
CREATE INDEX IF NOT EXISTS rooms_visibility_city_member_idx
  ON public.rooms (visibility, city_id, member_count DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS rooms_name_trgm_idx
  ON public.rooms USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS rooms_slug_trgm_idx
  ON public.rooms USING gin (slug gin_trgm_ops);

-- Post caption search (bounded queries use ilike + limit)
CREATE INDEX IF NOT EXISTS posts_caption_trgm_idx
  ON public.posts USING gin (caption gin_trgm_ops);

CREATE INDEX IF NOT EXISTS posts_profile_created_idx
  ON public.posts (profile_id, created_at DESC);

-- Trending: posts in a recent window ranked by real like counts (ties: newer first)
CREATE OR REPLACE FUNCTION public.discovery_trending_post_ids(
  p_days int DEFAULT 7,
  p_limit int DEFAULT 15
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.posts p
  LEFT JOIN public.post_likes pl ON pl.post_id = p.id
  WHERE p.created_at >= now() - (p_days * interval '1 day')
  GROUP BY p.id
  ORDER BY COUNT(pl.post_id) DESC, MAX(p.created_at) DESC
  LIMIT p_limit;
$$;

-- Rising: profiles with the most posts in a recent window (real activity; optional city scope)
CREATE OR REPLACE FUNCTION public.discovery_rising_profile_ids(
  p_scope_city_id uuid DEFAULT NULL,
  p_days int DEFAULT 14,
  p_limit int DEFAULT 12
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  INNER JOIN public.posts po
    ON po.profile_id = p.id
    AND po.created_at >= now() - (p_days * interval '1 day')
  WHERE (p_scope_city_id IS NULL OR p.city_id = p_scope_city_id)
  GROUP BY p.id
  ORDER BY COUNT(po.id) DESC, MAX(po.created_at) DESC
  LIMIT p_limit;
$$;

-- Trending scoped to DJs in a given city (canonical profile.city_id)
CREATE OR REPLACE FUNCTION public.discovery_trending_post_ids_for_city(
  p_city_id uuid,
  p_days int DEFAULT 7,
  p_limit int DEFAULT 15
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.posts p
  INNER JOIN public.profiles pr
    ON pr.id = p.profile_id
    AND pr.city_id = p_city_id
  LEFT JOIN public.post_likes pl ON pl.post_id = p.id
  WHERE p.created_at >= now() - (p_days * interval '1 day')
  GROUP BY p.id
  ORDER BY COUNT(pl.post_id) DESC, MAX(p.created_at) DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.discovery_trending_post_ids(int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discovery_trending_post_ids_for_city(uuid, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discovery_rising_profile_ids(uuid, int, int) TO anon, authenticated;
