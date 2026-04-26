-- Retention-safe account deletion requests: keep audit rows after auth/profile removal.
-- Replaces ON DELETE CASCADE with SET NULL + snapshots so tickets are not destroyed by FK cascades.

-- ---------------------------------------------------------------------------
-- Snapshot at submission time (audit); backfill from profiles for existing rows
-- ---------------------------------------------------------------------------

ALTER TABLE public.account_deletion_requests
  ADD COLUMN IF NOT EXISTS profile_handle_snapshot text;

UPDATE public.account_deletion_requests adr
SET profile_handle_snapshot = COALESCE(p.handle, '(unknown)')
FROM public.profiles p
WHERE adr.profile_id = p.id;

UPDATE public.account_deletion_requests
SET profile_handle_snapshot = '(unknown)'
WHERE profile_handle_snapshot IS NULL;

ALTER TABLE public.account_deletion_requests
  ALTER COLUMN profile_handle_snapshot SET DEFAULT '(unknown)',
  ALTER COLUMN profile_handle_snapshot SET NOT NULL;

COMMENT ON COLUMN public.account_deletion_requests.profile_handle_snapshot IS
  'Copy of profile.handle at request time; preserved if profile row is removed.';

-- ---------------------------------------------------------------------------
-- FK: retain request row when auth user or profile is deleted (SET NULL)
-- ---------------------------------------------------------------------------

ALTER TABLE public.account_deletion_requests
  DROP CONSTRAINT IF EXISTS account_deletion_requests_user_id_fkey;

ALTER TABLE public.account_deletion_requests
  DROP CONSTRAINT IF EXISTS account_deletion_requests_profile_id_fkey;

ALTER TABLE public.account_deletion_requests
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_requests_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles (id) ON DELETE SET NULL;

-- One pending ticket per user (only when user_id is still known)
DROP INDEX IF EXISTS account_deletion_one_pending_per_user;

CREATE UNIQUE INDEX account_deletion_one_pending_per_user
  ON public.account_deletion_requests (user_id)
  WHERE status = 'pending' AND user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Immutability: allow NULLing user_id/profile_id for archival; block swaps
-- ---------------------------------------------------------------------------

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
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.profile_handle_snapshot IS DISTINCT FROM OLD.profile_handle_snapshot THEN
    RAISE EXCEPTION 'Immutable fields on account_deletion_requests cannot change.';
  END IF;
  IF (NEW.user_id IS NOT NULL AND OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id)
     OR (NEW.profile_id IS NOT NULL AND OLD.profile_id IS NOT NULL AND NEW.profile_id IS DISTINCT FROM OLD.profile_id) THEN
    RAISE EXCEPTION 'Cannot reassign user_id or profile_id on account_deletion_requests.';
  END IF;
  RETURN NEW;
END;
$$;
