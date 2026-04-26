-- Align Storage max object size with feed video cap (see MAX_POST_VIDEO_BYTES in app code).
-- Previous limit was 50 MiB (52428800), which blocked longer phone clips even when the app allowed more.

UPDATE storage.buckets
SET file_size_limit = 367001600 -- 350 MiB
WHERE id = 'post_media';
