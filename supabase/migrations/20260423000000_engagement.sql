-- Phase 5: Comments, likes, saves (private), follows

-- Likes: one row per (post, liker profile)
CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);

CREATE INDEX post_likes_post_id_idx ON public.post_likes (post_id);
CREATE INDEX post_likes_profile_id_idx ON public.post_likes (profile_id);

-- Saves: private bookmarks (RLS: only owner sees rows)
CREATE TABLE public.post_saves (
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);

CREATE INDEX post_saves_post_id_idx ON public.post_saves (post_id);
CREATE INDEX post_saves_profile_id_idx ON public.post_saves (profile_id);

-- Comments
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_comments_body_len CHECK (char_length(body) <= 2000)
);

CREATE INDEX post_comments_post_id_created_idx
  ON public.post_comments (post_id, created_at);

CREATE OR REPLACE FUNCTION public.set_post_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER post_comments_set_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_post_comments_updated_at();

-- Follows: follower follows following (profile ids)
CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX follows_following_id_idx ON public.follows (following_id);
CREATE INDEX follows_follower_id_idx ON public.follows (follower_id);

-- RLS -------------------------------------------------------------------------

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Likes: public read for counts; write as own profile only
CREATE POLICY "post_likes_select_public"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "post_likes_insert_own"
  ON public.post_likes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())
  );

CREATE POLICY "post_likes_delete_own"
  ON public.post_likes FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())
  );

-- Saves: only owner sees or mutates
CREATE POLICY "post_saves_select_own"
  ON public.post_saves FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())
  );

CREATE POLICY "post_saves_insert_own"
  ON public.post_saves FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())
  );

CREATE POLICY "post_saves_delete_own"
  ON public.post_saves FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())
  );

-- Comments: public read; insert as self; delete own
CREATE POLICY "post_comments_select_public"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "post_comments_insert_own_author"
  ON public.post_comments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = author_profile_id AND p.user_id = auth.uid())
  );

CREATE POLICY "post_comments_delete_own"
  ON public.post_comments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = author_profile_id AND p.user_id = auth.uid())
  );

-- Follows: public read; mutate only as follower
CREATE POLICY "follows_select_public"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "follows_insert_as_follower"
  ON public.follows FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = follower_id AND p.user_id = auth.uid())
  );

CREATE POLICY "follows_delete_as_follower"
  ON public.follows FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = follower_id AND p.user_id = auth.uid())
  );
