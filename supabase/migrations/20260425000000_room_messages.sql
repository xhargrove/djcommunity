-- Phase 7: Room text chat (realtime-enabled)
--
-- Prerequisite: migration 20260424000000_rooms.sql must be applied first
-- (creates public.rooms and public.room_memberships). If you see
-- "relation public.rooms does not exist", apply earlier migrations in order
-- or run: supabase db push (from repo root with linked project).

CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  sender_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_messages_body_len CHECK (char_length(body) <= 4000)
);

CREATE INDEX room_messages_room_created_idx
  ON public.room_messages (room_id, created_at ASC, id ASC);

-- So realtime DELETE events include row keys (for UI sync when others delete)
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Read messages only if you are a member of the room
CREATE POLICY "room_messages_select_members"
  ON public.room_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.room_memberships rm
      JOIN public.profiles p ON p.id = rm.profile_id
      WHERE rm.room_id = room_messages.room_id
        AND p.user_id = auth.uid()
    )
  );

-- Post only as yourself and only as a member of that room
CREATE POLICY "room_messages_insert_member"
  ON public.room_messages FOR INSERT
  WITH CHECK (
    sender_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.room_memberships rm
      WHERE rm.room_id = room_messages.room_id
        AND rm.profile_id = sender_profile_id
    )
  );

-- Delete own messages
CREATE POLICY "room_messages_delete_own"
  ON public.room_messages FOR DELETE
  USING (
    sender_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Owner/admin can delete any message in the room (moderation)
CREATE POLICY "room_messages_delete_moderator"
  ON public.room_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.room_memberships me
      JOIN public.profiles p ON p.id = me.profile_id
      WHERE me.room_id = room_messages.room_id
        AND p.user_id = auth.uid()
        AND me.role IN ('owner', 'admin')
    )
  );

-- Realtime: broadcast inserts/updates/deletes to authorized subscribers (RLS applies)
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
