-- Phase 9: In-app notifications (DB triggers = trusted writers)

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  actor_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (
    type IN ('follow', 'post_like', 'post_comment', 'room_message')
  ),
  post_id uuid REFERENCES public.posts (id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.post_comments (id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms (id) ON DELETE CASCADE,
  room_message_id uuid REFERENCES public.room_messages (id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_no_self CHECK (recipient_profile_id <> actor_profile_id),
  CONSTRAINT notifications_payload_follow CHECK (
    type <> 'follow'
    OR (
      post_id IS NULL
      AND comment_id IS NULL
      AND room_id IS NULL
      AND room_message_id IS NULL
    )
  ),
  CONSTRAINT notifications_payload_like CHECK (
    type <> 'post_like'
    OR (
      post_id IS NOT NULL
      AND comment_id IS NULL
      AND room_id IS NULL
      AND room_message_id IS NULL
    )
  ),
  CONSTRAINT notifications_payload_comment CHECK (
    type <> 'post_comment'
    OR (
      post_id IS NOT NULL
      AND comment_id IS NOT NULL
      AND room_id IS NULL
      AND room_message_id IS NULL
    )
  ),
  CONSTRAINT notifications_payload_room CHECK (
    type <> 'room_message'
    OR (
      room_id IS NOT NULL
      AND room_message_id IS NOT NULL
      AND post_id IS NULL
      AND comment_id IS NULL
    )
  )
);

CREATE INDEX notifications_recipient_created_idx
  ON public.notifications (recipient_profile_id, created_at DESC);

CREATE INDEX notifications_recipient_unread_idx
  ON public.notifications (recipient_profile_id)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX notifications_follow_dedupe_idx
  ON public.notifications (recipient_profile_id, actor_profile_id)
  WHERE type = 'follow';

CREATE UNIQUE INDEX notifications_like_dedupe_idx
  ON public.notifications (recipient_profile_id, actor_profile_id, post_id)
  WHERE type = 'post_like';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_recipient"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = notifications.recipient_profile_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "notifications_update_read_own"
  ON public.notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = notifications.recipient_profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = notifications.recipient_profile_id
        AND p.user_id = auth.uid()
    )
  );

-- No INSERT/DELETE for clients — rows come from triggers only.

CREATE OR REPLACE FUNCTION public.trg_notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_profile_id uuid;
BEGIN
  -- := + scalar subquery avoids plain-SQL SELECT INTO (create-table) confusion in some clients.
  v_post_owner_profile_id := (
    SELECT p.profile_id FROM public.posts p WHERE p.id = NEW.post_id
  );
  IF v_post_owner_profile_id IS NULL OR v_post_owner_profile_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;
  EXECUTE
    'INSERT INTO public.notifications (recipient_profile_id, actor_profile_id, type, post_id) VALUES ($1, $2, $3, $4)'
  USING v_post_owner_profile_id, NEW.profile_id, 'post_like'::text, NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER post_likes_notify_insert
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_post_like();

CREATE OR REPLACE FUNCTION public.trg_cleanup_post_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE type = 'post_like'
    AND post_id = OLD.post_id
    AND actor_profile_id = OLD.profile_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER post_likes_notify_delete
  AFTER DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cleanup_post_like_notification();

CREATE OR REPLACE FUNCTION public.trg_notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_profile_id uuid;
BEGIN
  v_post_owner_profile_id := (
    SELECT p.profile_id FROM public.posts p WHERE p.id = NEW.post_id
  );
  IF v_post_owner_profile_id IS NULL OR v_post_owner_profile_id = NEW.author_profile_id THEN
    RETURN NEW;
  END IF;
  EXECUTE
    'INSERT INTO public.notifications (recipient_profile_id, actor_profile_id, type, post_id, comment_id) VALUES ($1, $2, $3, $4, $5)'
  USING
    v_post_owner_profile_id,
    NEW.author_profile_id,
    'post_comment'::text,
    NEW.post_id,
    NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER post_comments_notify_insert
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_post_comment();

CREATE OR REPLACE FUNCTION public.trg_notify_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;
  EXECUTE
    'INSERT INTO public.notifications (recipient_profile_id, actor_profile_id, type) VALUES ($1, $2, $3)'
  USING NEW.following_id, NEW.follower_id, 'follow'::text;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

CREATE TRIGGER follows_notify_insert
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_follow();

CREATE OR REPLACE FUNCTION public.trg_cleanup_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE type = 'follow'
    AND recipient_profile_id = OLD.following_id
    AND actor_profile_id = OLD.follower_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER follows_notify_delete
  AFTER DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cleanup_follow_notification();

CREATE OR REPLACE FUNCTION public.trg_notify_room_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_creator_profile_id uuid;
BEGIN
  v_room_creator_profile_id := (
    SELECT r.created_by_profile_id FROM public.rooms r WHERE r.id = NEW.room_id
  );
  IF v_room_creator_profile_id IS NULL OR v_room_creator_profile_id = NEW.sender_profile_id THEN
    RETURN NEW;
  END IF;
  EXECUTE
    'INSERT INTO public.notifications (recipient_profile_id, actor_profile_id, type, room_id, room_message_id) VALUES ($1, $2, $3, $4, $5)'
  USING
    v_room_creator_profile_id,
    NEW.sender_profile_id,
    'room_message'::text,
    NEW.room_id,
    NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER room_messages_notify_insert
  AFTER INSERT ON public.room_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_room_message();
