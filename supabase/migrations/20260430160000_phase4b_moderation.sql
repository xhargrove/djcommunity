-- Phase 4B: Staff moderation — platform roles, RLS, staff-only triage table (internal notes not visible to reporters).
-- Idempotent where practical.

-- ---------------------------------------------------------------------------
-- Extend platform roles: moderator (triage-only; team promotion still owner-only in app)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_site_role_allowed;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_site_role_allowed CHECK (
    site_role = ANY (ARRAY['member', 'moderator', 'admin', 'owner']::text[])
  );

COMMENT ON COLUMN public.profiles.site_role IS
  'Platform: member (default), moderator (content triage), admin, owner. site_role mutations require service_role.';

-- ---------------------------------------------------------------------------
-- Migrate optional legacy columns off content_reports into staff-only triage
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.content_report_triage (
  report_id uuid PRIMARY KEY REFERENCES public.content_reports (id) ON DELETE CASCADE,
  staff_note text,
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT content_report_triage_staff_note_len CHECK (
    staff_note IS NULL OR char_length(staff_note) <= 2000
  )
);

CREATE INDEX IF NOT EXISTS content_report_triage_reviewed_idx
  ON public.content_report_triage (reviewed_at DESC NULLS LAST);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'staff_note'
  ) THEN
    INSERT INTO public.content_report_triage (report_id, staff_note, reviewed_at, reviewed_by_profile_id)
    SELECT id, staff_note, reviewed_at, reviewed_by_profile_id
    FROM public.content_reports
    WHERE staff_note IS NOT NULL OR reviewed_at IS NOT NULL OR reviewed_by_profile_id IS NOT NULL
    ON CONFLICT (report_id) DO UPDATE SET
      staff_note = COALESCE(EXCLUDED.staff_note, public.content_report_triage.staff_note),
      reviewed_at = COALESCE(EXCLUDED.reviewed_at, public.content_report_triage.reviewed_at),
      reviewed_by_profile_id = COALESCE(EXCLUDED.reviewed_by_profile_id, public.content_report_triage.reviewed_by_profile_id);
    ALTER TABLE public.content_reports DROP COLUMN IF EXISTS staff_note;
    ALTER TABLE public.content_reports DROP COLUMN IF EXISTS reviewed_at;
    ALTER TABLE public.content_reports DROP COLUMN IF EXISTS reviewed_by_profile_id;
    ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_staff_note_len;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS content_reports_status_created_idx
  ON public.content_reports (status, created_at DESC);

-- Prevent tampering with reporter/target/submitted note after insert (status may change via staff policy).
CREATE OR REPLACE FUNCTION public.content_reports_lock_submitted_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  -- Allow status updates for staff; lock everything else submitted by the reporter.
  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.reporter_profile_id IS DISTINCT FROM NEW.reporter_profile_id
     OR OLD.target_kind IS DISTINCT FROM NEW.target_kind
     OR OLD.target_id IS DISTINCT FROM NEW.target_id
     OR OLD.note IS DISTINCT FROM NEW.note
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Submitted report fields cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_reports_lock_submitted_fields ON public.content_reports;
CREATE TRIGGER content_reports_lock_submitted_fields
  BEFORE UPDATE ON public.content_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.content_reports_lock_submitted_fields();

-- ---------------------------------------------------------------------------
-- RLS: content_reports — staff read all; staff update status only (immutable fields locked in trigger)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "content_reports_select_staff" ON public.content_reports;
CREATE POLICY "content_reports_select_staff"
  ON public.content_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['moderator', 'admin', 'owner']::text[])
    )
  );

DROP POLICY IF EXISTS "content_reports_update_staff" ON public.content_reports;
CREATE POLICY "content_reports_update_staff"
  ON public.content_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['moderator', 'admin', 'owner']::text[])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['moderator', 'admin', 'owner']::text[])
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: triage — staff only (reporters have no path to read internal notes)
-- ---------------------------------------------------------------------------

ALTER TABLE public.content_report_triage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_report_triage_select_staff" ON public.content_report_triage;
CREATE POLICY "content_report_triage_select_staff"
  ON public.content_report_triage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['moderator', 'admin', 'owner']::text[])
    )
  );

DROP POLICY IF EXISTS "content_report_triage_insert_staff" ON public.content_report_triage;
CREATE POLICY "content_report_triage_insert_staff"
  ON public.content_report_triage FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['moderator', 'admin', 'owner']::text[])
    )
  );

DROP POLICY IF EXISTS "content_report_triage_update_staff" ON public.content_report_triage;
CREATE POLICY "content_report_triage_update_staff"
  ON public.content_report_triage FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['moderator', 'admin', 'owner']::text[])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['moderator', 'admin', 'owner']::text[])
    )
  );

DROP POLICY IF EXISTS "content_report_triage_delete_staff" ON public.content_report_triage;
CREATE POLICY "content_report_triage_delete_staff"
  ON public.content_report_triage FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['moderator', 'admin', 'owner']::text[])
    )
  );
