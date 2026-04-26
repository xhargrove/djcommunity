-- Mashups & Mixtapes: DJs share external download/stream links (no file hosting in-app).

CREATE TABLE public.mashup_mixtape_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  download_url text NOT NULL,
  kind text NOT NULL DEFAULT 'mixtape'
    CONSTRAINT mashup_mixtape_posts_kind_allowed CHECK (
      kind = ANY (ARRAY['mashup', 'mixtape', 'other']::text[])
    ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mashup_mixtape_posts_title_len CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT mashup_mixtape_posts_description_len CHECK (
    description IS NULL OR char_length(description) <= 2000
  ),
  CONSTRAINT mashup_mixtape_posts_url_https CHECK (
    download_url ~ '^https://'
  )
);

CREATE INDEX mashup_mixtape_posts_created_at_idx
  ON public.mashup_mixtape_posts (created_at DESC);
CREATE INDEX mashup_mixtape_posts_profile_id_idx
  ON public.mashup_mixtape_posts (profile_id);

COMMENT ON TABLE public.mashup_mixtape_posts IS
  'External links to mashups/mixtapes; user-provided URLs. See /mashups-mixtapes.';

CREATE OR REPLACE FUNCTION public.set_mashup_mixtape_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER mashup_mixtape_posts_set_updated_at
  BEFORE UPDATE ON public.mashup_mixtape_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_mashup_mixtape_posts_updated_at();

ALTER TABLE public.mashup_mixtape_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mashup_mixtape_posts_select_public"
  ON public.mashup_mixtape_posts FOR SELECT
  USING (true);

CREATE POLICY "mashup_mixtape_posts_insert_own"
  ON public.mashup_mixtape_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "mashup_mixtape_posts_update_own"
  ON public.mashup_mixtape_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "mashup_mixtape_posts_delete_own"
  ON public.mashup_mixtape_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );
