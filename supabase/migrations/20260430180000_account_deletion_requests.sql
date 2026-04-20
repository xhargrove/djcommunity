-- Account deletion requests: durable ticket for operator-driven lifecycle (not automated erasure).
-- RLS: users insert/select own pending path; platform admin + owner read/update queue.

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT account_deletion_requests_status_allowed CHECK (
      status = ANY (
        ARRAY['pending', 'processing', 'completed', 'cancelled']::text[]
      )
    ),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  staff_note text,
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT account_deletion_requests_message_len CHECK (
    message IS NULL OR char_length(message) <= 2000
  ),
  CONSTRAINT account_deletion_requests_staff_note_len CHECK (
    staff_note IS NULL OR char_length(staff_note) <= 2000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_one_pending_per_user
  ON public.account_deletion_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS account_deletion_requests_status_created_idx
  ON public.account_deletion_requests (status, created_at DESC);

COMMENT ON TABLE public.account_deletion_requests IS
  'User-submitted account deletion tickets. Processing is manual (Auth + DB + storage); see docs/ACCOUNT_DATA_CONTROLS.md.';

CREATE OR REPLACE FUNCTION public.account_deletion_requests_lock_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Immutable fields on account_deletion_requests cannot change.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS account_deletion_requests_lock_immutable ON public.account_deletion_requests;
CREATE TRIGGER account_deletion_requests_lock_immutable
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.account_deletion_requests_lock_immutable();

CREATE OR REPLACE FUNCTION public.set_account_deletion_requests_updated_at()
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

DROP TRIGGER IF EXISTS account_deletion_requests_set_updated_at ON public.account_deletion_requests;
CREATE TRIGGER account_deletion_requests_set_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_account_deletion_requests_updated_at();

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_deletion_requests_select_own" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_select_own"
  ON public.account_deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "account_deletion_requests_select_staff" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_select_staff"
  ON public.account_deletion_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['admin', 'owner']::text[])
    )
  );

DROP POLICY IF EXISTS "account_deletion_requests_insert_own" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_insert_own"
  ON public.account_deletion_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = profile_id AND pr.user_id = auth.uid()
    )
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "account_deletion_requests_update_staff" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_update_staff"
  ON public.account_deletion_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['admin', 'owner']::text[])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.site_role = ANY (ARRAY['admin', 'owner']::text[])
    )
  );

DROP POLICY IF EXISTS "account_deletion_requests_cancel_own" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_cancel_own"
  ON public.account_deletion_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
