-- How media is framed in the feed (Instagram-style crop): 4:5 portrait feed, 1:1 square, 9:16 story/reel vertical.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_aspect_ratio text NOT NULL DEFAULT '4_5'
    CHECK (media_aspect_ratio IN ('4_5', '1_1', '9_16'));

COMMENT ON COLUMN public.posts.media_aspect_ratio IS
  'Display crop for post media: 4_5 (portrait feed), 1_1 (square), 9_16 (full vertical).';
