-- Phase 4: Trust & safety — profile blocks + content reports (real RLS; no client-only authority)
-- Idempotent: safe if objects already exist (e.g. partial apply or manual create).

-- ---------------------------------------------------------------------------
-- Blocks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_blocks (
  blocker_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  blocked_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_profile_id, blocked_profile_id),
  CONSTRAINT profile_blocks_no_self CHECK (blocker_profile_id <> blocked_profile_id)
);

CREATE INDEX IF NOT EXISTS profile_blocks_blocked_idx ON public.profile_blocks (blocked_profile_id);

ALTER TABLE public.profile_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_blocks_select_own" ON public.profile_blocks;
CREATE POLICY "profile_blocks_select_own"
  ON public.profile_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_blocks.blocker_profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profile_blocks_insert_own" ON public.profile_blocks;
CREATE POLICY "profile_blocks_insert_own"
  ON public.profile_blocks FOR INSERT
  WITH CHECK (
    blocker_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "profile_blocks_delete_own" ON public.profile_blocks;
CREATE POLICY "profile_blocks_delete_own"
  ON public.profile_blocks FOR DELETE
  USING (
    blocker_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.report_target_kind AS ENUM (
    'post',
    'post_comment',
    'room',
    'room_message',
    'profile'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  target_kind public.report_target_kind NOT NULL,
  target_id uuid NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_note_len CHECK (note IS NULL OR char_length(note) <= 2000),
  CONSTRAINT content_reports_status_check CHECK (status IN ('open', 'reviewed', 'dismissed')),
  CONSTRAINT content_reports_one_per_target UNIQUE (reporter_profile_id, target_kind, target_id)
);

CREATE INDEX IF NOT EXISTS content_reports_target_idx ON public.content_reports (target_kind, target_id);
CREATE INDEX IF NOT EXISTS content_reports_created_idx ON public.content_reports (created_at DESC);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_reports_select_own" ON public.content_reports;
CREATE POLICY "content_reports_select_own"
  ON public.content_reports FOR SELECT
  USING (
    reporter_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "content_reports_insert_own" ON public.content_reports;
CREATE POLICY "content_reports_insert_own"
  ON public.content_reports FOR INSERT
  WITH CHECK (
    reporter_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
