-- Phase 3: Canonical taxonomy (cities, genres, DJ types) + profile wiring
-- Run after Phase 2 profiles exist.

-- 1) Taxonomy tables ----------------------------------------------------------

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  region text,
  country_code text NOT NULL DEFAULT 'US',
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dj_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cities_select_public" ON public.cities FOR SELECT USING (true);
CREATE POLICY "genres_select_public" ON public.genres FOR SELECT USING (true);
CREATE POLICY "dj_types_select_public" ON public.dj_types FOR SELECT USING (true);

-- 2) Seed cities (Atlanta first) --------------------------------------------

INSERT INTO public.cities (slug, name, region, sort_order) VALUES
  ('atlanta', 'Atlanta', 'GA', 0),
  ('los_angeles', 'Los Angeles', 'CA', 10),
  ('new_york', 'New York', 'NY', 20),
  ('chicago', 'Chicago', 'IL', 30),
  ('miami', 'Miami', 'FL', 40),
  ('nashville', 'Nashville', 'TN', 50),
  ('austin', 'Austin', 'TX', 60),
  ('seattle', 'Seattle', 'WA', 70),
  ('denver', 'Denver', 'CO', 80),
  ('boston', 'Boston', 'MA', 90),
  ('philadelphia', 'Philadelphia', 'PA', 100),
  ('san_francisco', 'San Francisco', 'CA', 110),
  ('houston', 'Houston', 'TX', 120),
  ('dallas', 'Dallas', 'TX', 130),
  ('phoenix', 'Phoenix', 'AZ', 140),
  ('portland', 'Portland', 'OR', 150),
  ('washington_dc', 'Washington', 'DC', 160),
  ('orlando', 'Orlando', 'FL', 170),
  ('las_vegas', 'Las Vegas', 'NV', 180),
  ('new_orleans', 'New Orleans', 'LA', 190),
  ('detroit', 'Detroit', 'MI', 200);

-- 3) Seed genres (stable slugs; matches legacy PROFILE_GENRES) --------------

INSERT INTO public.genres (slug, label, sort_order) VALUES
  ('house', 'House', 10),
  ('techno', 'Techno', 20),
  ('trance', 'Trance', 30),
  ('dubstep', 'Dubstep', 40),
  ('drum_and_bass', 'Drum & bass', 50),
  ('hip_hop', 'Hip hop', 60),
  ('r_and_b', 'R&B', 70),
  ('pop', 'Pop', 80),
  ('disco', 'Disco', 90),
  ('funk', 'Funk', 100),
  ('soul', 'Soul', 110),
  ('latin', 'Latin', 120),
  ('reggae', 'Reggae', 130),
  ('ambient', 'Ambient', 140),
  ('indie', 'Indie', 150),
  ('rock', 'Rock', 160),
  ('open_format', 'Open format', 170),
  ('top_40', 'Top 40', 180),
  ('other', 'Other', 190);

-- 4) Seed canonical DJ types (Phase 3) --------------------------------------

INSERT INTO public.dj_types (slug, label, sort_order) VALUES
  ('club_dj', 'Club DJ', 10),
  ('vinyl_dj', 'Vinyl DJ', 20),
  ('open_format_dj', 'Open format DJ', 30),
  ('radio_dj', 'Radio DJ', 40),
  ('battle_dj', 'Battle DJ', 50),
  ('producer_dj', 'Producer-DJ', 60),
  ('curator', 'Curator', 70);

-- 5) Add FK columns on profiles (nullable during backfill) --------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS dj_type_id uuid REFERENCES public.dj_types(id);

-- 6) Junction: profile ↔ genre -----------------------------------------------

CREATE TABLE public.profile_genres (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, genre_id)
);

CREATE INDEX profile_genres_genre_id_idx ON public.profile_genres (genre_id);

ALTER TABLE public.profile_genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_genres_select_public"
  ON public.profile_genres FOR SELECT USING (true);

CREATE POLICY "profile_genres_insert_own"
  ON public.profile_genres FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "profile_genres_delete_own"
  ON public.profile_genres FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

-- 7) Backfill dj_type_id from legacy text column ------------------------------

UPDATE public.profiles p
SET dj_type_id = d.id
FROM public.dj_types d
WHERE p.dj_type = 'open_format' AND d.slug = 'open_format_dj';

UPDATE public.profiles p
SET dj_type_id = d.id
FROM public.dj_types d
WHERE p.dj_type = 'club' AND d.slug = 'club_dj';

UPDATE public.profiles p
SET dj_type_id = d.id
FROM public.dj_types d
WHERE p.dj_type IN ('mobile', 'wedding') AND d.slug = 'open_format_dj';

UPDATE public.profiles p
SET dj_type_id = d.id
FROM public.dj_types d
WHERE p.dj_type = 'radio' AND d.slug = 'radio_dj';

UPDATE public.profiles p
SET dj_type_id = d.id
FROM public.dj_types d
WHERE p.dj_type = 'producer' AND d.slug = 'producer_dj';

UPDATE public.profiles p
SET dj_type_id = d.id
FROM public.dj_types d
WHERE p.dj_type = 'turntablist' AND d.slug = 'battle_dj';

UPDATE public.profiles p
SET dj_type_id = d.id
FROM public.dj_types d
WHERE p.dj_type = 'other' AND d.slug = 'curator';

UPDATE public.profiles p
SET dj_type_id = (SELECT id FROM public.dj_types WHERE slug = 'open_format_dj' LIMIT 1)
WHERE p.dj_type_id IS NULL;

-- 8) Backfill city_id from legacy free text -----------------------------------

UPDATE public.profiles p
SET city_id = c.id
FROM public.cities c
WHERE p.city IS NOT NULL
  AND trim(p.city) <> ''
  AND lower(trim(p.city)) = lower(c.name);

UPDATE public.profiles p
SET city_id = c.id
FROM public.cities c
WHERE p.city_id IS NULL
  AND p.city IS NOT NULL
  AND trim(p.city) <> ''
  AND lower(replace(trim(p.city), ' ', '_')) = c.slug;

UPDATE public.profiles
SET city_id = (SELECT id FROM public.cities WHERE slug = 'atlanta' LIMIT 1)
WHERE city_id IS NULL;

-- 9) Backfill profile_genres from legacy text[] -------------------------------

INSERT INTO public.profile_genres (profile_id, genre_id)
SELECT p.id, g.id
FROM public.profiles p
CROSS JOIN LATERAL unnest(p.genres) AS x(slug)
JOIN public.genres g ON g.slug = x.slug
ON CONFLICT DO NOTHING;

INSERT INTO public.profile_genres (profile_id, genre_id)
SELECT p.id, (SELECT id FROM public.genres WHERE slug = 'other' LIMIT 1)
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.profile_genres pg WHERE pg.profile_id = p.id
);

-- 10) Drop legacy columns & constraints ---------------------------------------

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_dj_type_allowed;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS city;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS genres;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS dj_type;

ALTER TABLE public.profiles
  ALTER COLUMN city_id SET NOT NULL,
  ALTER COLUMN dj_type_id SET NOT NULL;
