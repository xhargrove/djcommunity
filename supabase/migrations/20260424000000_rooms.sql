-- Phase 6: Rooms / communities (no realtime chat)

CREATE TYPE public.room_visibility AS ENUM ('public', 'private');
CREATE TYPE public.room_type AS ENUM ('city', 'crew', 'topic');
CREATE TYPE public.room_member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  visibility public.room_visibility NOT NULL DEFAULT 'public',
  room_type public.room_type NOT NULL DEFAULT 'topic',
  city_id uuid REFERENCES public.cities (id) ON DELETE SET NULL,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  member_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rooms_slug_format CHECK (
    slug ~ '^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$'
  ),
  CONSTRAINT rooms_name_len CHECK (char_length(name) <= 120),
  CONSTRAINT rooms_desc_len CHECK (description IS NULL OR char_length(description) <= 2000)
);

CREATE INDEX rooms_visibility_idx ON public.rooms (visibility);
CREATE INDEX rooms_created_at_idx ON public.rooms (created_at DESC);
CREATE INDEX rooms_created_by_idx ON public.rooms (created_by_profile_id);

CREATE TABLE public.room_memberships (
  room_id uuid NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.room_member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, profile_id)
);

CREATE UNIQUE INDEX room_memberships_one_owner_per_room
  ON public.room_memberships (room_id)
  WHERE role = 'owner';

CREATE INDEX room_memberships_profile_id_idx ON public.room_memberships (profile_id);

CREATE OR REPLACE FUNCTION public.set_rooms_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER rooms_set_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_rooms_updated_at();

CREATE OR REPLACE FUNCTION public.adjust_room_member_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rooms
    SET member_count = member_count + 1
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rooms
    SET member_count = GREATEST(0, member_count - 1)
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER room_memberships_adjust_count
AFTER INSERT OR DELETE ON public.room_memberships
FOR EACH ROW
EXECUTE FUNCTION public.adjust_room_member_count();

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_memberships ENABLE ROW LEVEL SECURITY;

-- Rooms: see public rooms, or any room you are a member of
CREATE POLICY "rooms_select_visible"
  ON public.rooms FOR SELECT
  USING (
    visibility = 'public'
    OR EXISTS (
      SELECT 1
      FROM public.room_memberships rm
      JOIN public.profiles p ON p.id = rm.profile_id
      WHERE rm.room_id = rooms.id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_insert_creator"
  ON public.rooms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = created_by_profile_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_update_owner_admin"
  ON public.rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.room_memberships rm
      JOIN public.profiles p ON p.id = rm.profile_id
      WHERE rm.room_id = rooms.id
        AND p.user_id = auth.uid()
        AND rm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.room_memberships rm
      JOIN public.profiles p ON p.id = rm.profile_id
      WHERE rm.room_id = rooms.id
        AND p.user_id = auth.uid()
        AND rm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "rooms_delete_owner"
  ON public.rooms FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.room_memberships rm
      JOIN public.profiles p ON p.id = rm.profile_id
      WHERE rm.room_id = rooms.id
        AND p.user_id = auth.uid()
        AND rm.role = 'owner'
    )
  );

-- Memberships: members of the same room can see rows for that room
CREATE POLICY "room_memberships_select_same_room"
  ON public.room_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.room_memberships mine
      JOIN public.profiles p ON p.id = mine.profile_id
      WHERE mine.room_id = room_memberships.room_id
        AND p.user_id = auth.uid()
    )
  );

-- Creator adds self as owner (room must have zero memberships)
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
    AND NOT EXISTS (
      SELECT 1 FROM public.room_memberships x
      WHERE x.room_id = room_memberships.room_id
    )
  );

-- Join public room as member (room must already have membership — owner row created first)
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
    AND EXISTS (
      SELECT 1 FROM public.room_memberships x
      WHERE x.room_id = room_memberships.room_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.room_memberships x2
      WHERE x2.room_id = room_memberships.room_id
        AND x2.profile_id = room_memberships.profile_id
    )
  );

-- Owner/admin invites a member (private or extra members)
CREATE POLICY "room_memberships_insert_invite"
  ON public.room_memberships FOR INSERT
  WITH CHECK (
    role = 'member'
    AND EXISTS (
      SELECT 1 FROM public.profiles tgt WHERE tgt.id = room_memberships.profile_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.room_memberships me
      JOIN public.profiles op ON op.id = me.profile_id
      WHERE me.room_id = room_memberships.room_id
        AND op.user_id = auth.uid()
        AND me.role IN ('owner', 'admin')
    )
  );

-- Leave (non-owner removes own row)
CREATE POLICY "room_memberships_delete_leave"
  ON public.room_memberships FOR DELETE
  USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND role <> 'owner'
  );

-- Owner/admin removes another member (cannot remove owner)
CREATE POLICY "room_memberships_delete_kick"
  ON public.room_memberships FOR DELETE
  USING (
    role <> 'owner'
    AND EXISTS (
      SELECT 1
      FROM public.room_memberships me
      JOIN public.profiles op ON op.id = me.profile_id
      WHERE me.room_id = room_memberships.room_id
        AND op.user_id = auth.uid()
        AND me.role IN ('owner', 'admin')
    )
    AND room_memberships.profile_id <> (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
