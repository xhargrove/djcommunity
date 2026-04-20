-- Fix 42P17 "infinite recursion detected in policy for relation room_memberships".
-- Policies must not query room_memberships in a way that re-triggers the same table's RLS.
-- SECURITY DEFINER + table owner bypasses RLS inside these helpers (standard Supabase pattern).

CREATE OR REPLACE FUNCTION public.auth_user_is_room_member(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_memberships rm
    INNER JOIN public.profiles p ON p.id = rm.profile_id
    WHERE rm.room_id = p_room_id
      AND p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.room_has_members(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_memberships rm
    WHERE rm.room_id = p_room_id
  );
$$;

CREATE OR REPLACE FUNCTION public.room_profile_membership_exists(
  p_room_id uuid,
  p_profile_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_memberships rm
    WHERE rm.room_id = p_room_id
      AND rm.profile_id = p_profile_id
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_is_room_owner_or_admin(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_memberships rm
    INNER JOIN public.profiles p ON p.id = rm.profile_id
    WHERE rm.room_id = p_room_id
      AND p.user_id = auth.uid()
      AND rm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_is_room_owner(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_memberships rm
    INNER JOIN public.profiles p ON p.id = rm.profile_id
    WHERE rm.room_id = p_room_id
      AND p.user_id = auth.uid()
      AND rm.role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_is_room_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.room_has_members(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.room_profile_membership_exists(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user_is_room_owner_or_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user_is_room_owner(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_user_is_room_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_has_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_profile_membership_exists(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_is_room_owner_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_is_room_owner(uuid) TO authenticated;

-- Memberships: members of the same room can see rows for that room (no self-select)
DROP POLICY IF EXISTS "room_memberships_select_same_room" ON public.room_memberships;
CREATE POLICY "room_memberships_select_same_room"
  ON public.room_memberships FOR SELECT
  USING ( public.auth_user_is_room_member(room_id) );

DROP POLICY IF EXISTS "room_memberships_insert_creator_owner" ON public.room_memberships;
CREATE POLICY "room_memberships_insert_creator_owner"
  ON public.room_memberships FOR INSERT
  WITH CHECK (
    role = 'owner'
    AND profile_id = (
      SELECT r.created_by_profile_id
      FROM public.rooms r
      WHERE r.id = room_memberships.room_id
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = room_memberships.profile_id
        AND p.user_id = auth.uid()
    )
    AND NOT public.room_has_members(room_memberships.room_id)
  );

DROP POLICY IF EXISTS "room_memberships_insert_join_public" ON public.room_memberships;
CREATE POLICY "room_memberships_insert_join_public"
  ON public.room_memberships FOR INSERT
  WITH CHECK (
    role = 'member'
    AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_memberships.room_id
        AND r.visibility = 'public'
    )
    AND public.room_has_members(room_memberships.room_id)
    AND NOT public.room_profile_membership_exists(
      room_memberships.room_id,
      room_memberships.profile_id
    )
  );

DROP POLICY IF EXISTS "room_memberships_insert_invite" ON public.room_memberships;
CREATE POLICY "room_memberships_insert_invite"
  ON public.room_memberships FOR INSERT
  WITH CHECK (
    role = 'member'
    AND EXISTS (
      SELECT 1 FROM public.profiles tgt WHERE tgt.id = room_memberships.profile_id
    )
    AND public.auth_user_is_room_owner_or_admin(room_memberships.room_id)
  );

DROP POLICY IF EXISTS "room_memberships_delete_kick" ON public.room_memberships;
CREATE POLICY "room_memberships_delete_kick"
  ON public.room_memberships FOR DELETE
  USING (
    role <> 'owner'
    AND public.auth_user_is_room_owner_or_admin(room_memberships.room_id)
    AND room_memberships.profile_id <> (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Optional: rooms policies use room_memberships subqueries; swap to helpers for consistency + fewer RLS hops.
DROP POLICY IF EXISTS "rooms_select_visible" ON public.rooms;
CREATE POLICY "rooms_select_visible"
  ON public.rooms FOR SELECT
  USING (
    visibility = 'public'
    OR public.auth_user_is_room_member(id)
  );

DROP POLICY IF EXISTS "rooms_update_owner_admin" ON public.rooms;
CREATE POLICY "rooms_update_owner_admin"
  ON public.rooms FOR UPDATE
  USING ( public.auth_user_is_room_owner_or_admin(id) )
  WITH CHECK ( public.auth_user_is_room_owner_or_admin(id) );

DROP POLICY IF EXISTS "rooms_delete_owner" ON public.rooms;
CREATE POLICY "rooms_delete_owner"
  ON public.rooms FOR DELETE
  USING ( public.auth_user_is_room_owner(id) );
