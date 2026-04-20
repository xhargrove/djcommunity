-- Site-wide staff roles on profiles (owner > admin > member).
-- `site_role` may only change via Supabase service_role (server actions) or this migration path before the trigger exists.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS site_role text NOT NULL DEFAULT 'member'
  CONSTRAINT profiles_site_role_allowed CHECK (
    site_role = ANY (ARRAY['member', 'admin', 'owner']::text[])
  );

COMMENT ON COLUMN public.profiles.site_role IS
  'Platform staff: member (default), admin, or owner. Mutations require service_role.';

-- New profiles must stay members (blocks forged inserts).
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND site_role = 'member'
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.profiles_guard_site_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF OLD.site_role IS NOT DISTINCT FROM NEW.site_role THEN
    RETURN NEW;
  END IF;
  -- Service key requests use role service_role. DB superuser sessions (SQL editor) can bootstrap.
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role'
     AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Site role cannot be changed from the client.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_site_role_change ON public.profiles;
CREATE TRIGGER profiles_guard_site_role_change
  BEFORE UPDATE OF site_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_site_role_change();

-- Optional: set your first platform owner by handle (run once in SQL editor if you did not seed here).
-- UPDATE public.profiles SET site_role = 'owner' WHERE handle = 'your_handle';
