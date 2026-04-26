-- Add 16:9 (YouTube-style landscape) to allowed `media_aspect_ratio` values.

DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'posts'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%media_aspect_ratio%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_media_aspect_ratio_check
  CHECK (media_aspect_ratio IN ('4_5', '1_1', '9_16', '16_9'));

COMMENT ON COLUMN public.posts.media_aspect_ratio IS
  'Display crop: 4_5 portrait feed, 1_1 square, 9_16 full vertical, 16_9 YouTube-style landscape.';
