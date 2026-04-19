-- Phase 4: Posts, post media, feed (no comments/likes/follows)

CREATE TYPE public.post_type AS ENUM (
  'standard',
  'mix_drop',
  'event_recap',
  'transition_clip',
  'crate_post',
  'now_playing',
  'gear_setup'
);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  post_type public.post_type NOT NULL,
  caption text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_caption_length CHECK (char_length(caption) <= 5000)
);

CREATE INDEX posts_created_at_idx ON public.posts (created_at DESC);
CREATE INDEX posts_profile_id_idx ON public.posts (profile_id);

CREATE TABLE public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image', 'video')),
  mime_type text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_media_path_unique UNIQUE (storage_path)
);

CREATE INDEX post_media_post_id_idx ON public.post_media (post_id);

CREATE OR REPLACE FUNCTION public.set_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER posts_set_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.set_posts_updated_at();

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_public"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "posts_insert_own_profile"
  ON public.posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "posts_update_own"
  ON public.posts FOR UPDATE
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

CREATE POLICY "posts_delete_own"
  ON public.posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "post_media_select_public"
  ON public.post_media FOR SELECT
  USING (true);

CREATE POLICY "post_media_insert_owned_post"
  ON public.post_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts po
      JOIN public.profiles pr ON pr.id = po.profile_id
      WHERE po.id = post_id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "post_media_update_owned_post"
  ON public.post_media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts po
      JOIN public.profiles pr ON pr.id = po.profile_id
      WHERE po.id = post_id AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts po
      JOIN public.profiles pr ON pr.id = po.profile_id
      WHERE po.id = post_id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "post_media_delete_owned_post"
  ON public.post_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts po
      JOIN public.profiles pr ON pr.id = po.profile_id
      WHERE po.id = post_id AND pr.user_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post_media',
  'post_media',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "post_media_bucket_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post_media');

CREATE POLICY "post_media_bucket_insert_own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post_media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "post_media_bucket_update_own_folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post_media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'post_media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "post_media_bucket_delete_own_folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post_media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
