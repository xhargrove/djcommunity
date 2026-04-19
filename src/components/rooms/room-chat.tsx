"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  deleteRoomMessageAction,
  sendRoomMessageAction,
} from "@/actions/room-messages";
import type { RoomMessageView } from "@/lib/rooms/messages-queries";
import { profilePublicPath } from "@/lib/profile/paths";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type Props = {
  roomId: string;
  viewerProfileId: string;
  viewerRole: "owner" | "admin" | "member";
  initialMessages: RoomMessageView[];
};

export function RoomChat({
  roomId,
  viewerProfileId,
  viewerRole,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<RoomMessageView[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const seenIdsRef = useRef<Set<string>>(
    new Set(initialMessages.map((m) => m.id)),
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  const canModerate = viewerRole === "owner" || viewerRole === "admin";

  const mergeMessage = useCallback((msg: RoomMessageView) => {
    setMessages((prev) => {
      if (seenIdsRef.current.has(msg.id)) {
        return prev;
      }
      seenIdsRef.current.add(msg.id);
      return [...prev, msg].sort((a, b) => {
        const t = a.created_at.localeCompare(b.created_at);
        if (t !== 0) {
          return t;
        }
        return a.id.localeCompare(b.id);
      });
    });
  }, []);

  const fetchSender = useCallback(
    async (senderProfileId: string): Promise<RoomMessageView["sender"] | null> => {
      const supabase = getBrowserSupabaseClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .eq("id", senderProfileId)
        .maybeSingle();
      const p = data as {
        id: string;
        handle: string;
        display_name: string;
        avatar_url: string | null;
      } | null;
      if (!p) {
        return null;
      }
      return {
        profile_id: p.id,
        handle: p.handle,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      };
    },
    [],
  );

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    setRealtimeError(null);

    const filter = `room_id=eq.${roomId}`;

    const channel = supabase
      .channel(`room-chat:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            room_id: string;
            sender_profile_id: string;
            body: string;
            created_at: string;
          };
          if (seenIdsRef.current.has(row.id)) {
            return;
          }
          const sender = await fetchSender(row.sender_profile_id);
          if (!sender) {
            return;
          }
          mergeMessage({
            id: row.id,
            room_id: row.room_id,
            body: row.body,
            created_at: row.created_at,
            sender,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "room_messages",
          filter,
        },
        (payload) => {
          const oldRow = payload.old as { id?: string } | null;
          const id = oldRow?.id;
          if (!id) {
            return;
          }
          seenIdsRef.current.delete(id);
          setMessages((prev) => prev.filter((m) => m.id !== id));
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeError(
            "Lost connection to live updates. Refresh if messages look stale.",
          );
        }
        if (status === "SUBSCRIBED") {
          setRealtimeError(null);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, mergeMessage, fetchSender]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) {
      return;
    }
    setSendError(null);
    setSending(true);
    try {
      const r = await sendRoomMessageAction(roomId, text);
      if (!r.ok) {
        setSendError(r.error);
        return;
      }
      mergeMessage(r.message);
      setBody("");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    setSendError(null);
    const r = await deleteRoomMessageAction(roomId, messageId);
    if (!r.ok) {
      setSendError(r.error);
      return;
    }
    seenIdsRef.current.delete(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  return (
    <section className="flex flex-col rounded-lg border border-[var(--border)] bg-zinc-950/40">
      <div className="border-b border-[var(--border)] px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Chat
        </h2>
        <p className="text-[10px] text-zinc-600">
          Live for members only. Messages stay after refresh.
        </p>
      </div>

      {realtimeError ? (
        <p className="border-b border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
          {realtimeError}
        </p>
      ) : null}

      <div
        className="max-h-[min(420px,50vh)] min-h-[200px] overflow-y-auto px-3 py-3"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-zinc-600">
            No messages yet. Say hello.
          </p>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => {
              const isOwn = m.sender.profile_id === viewerProfileId;
              const showDelete = isOwn || canModerate;
              return (
                <li key={m.id} className="flex gap-2 text-sm">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                    {m.sender.avatar_url ? (
                      <Image
                        src={m.sender.avatar_url}
                        alt=""
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                        {m.sender.display_name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="font-medium text-zinc-200">
                        {m.sender.display_name}
                      </span>
                      <Link
                        href={profilePublicPath(m.sender.handle)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300"
                      >
                        @{m.sender.handle}
                      </Link>
                      <span className="text-[10px] text-zinc-600">
                        {formatMsgTime(m.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-zinc-300">
                      {m.body}
                    </p>
                    {showDelete ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="mt-1 text-[10px] text-zinc-600 hover:text-red-400"
                      >
                        {isOwn ? "Delete" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-[var(--border)] p-3"
      >
        {sendError ? (
          <p className="mb-2 text-xs text-red-400" role="alert">
            {sendError}
          </p>
        ) : null}
        <label htmlFor="room-chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="room-chat-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={4000}
          disabled={sending}
          placeholder="Write a message…"
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
