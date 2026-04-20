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
import { InlineReportControl } from "@/components/trust/inline-report";
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
  roomName: string;
  roomSlug: string;
  viewerProfileId: string;
  viewerRole: "owner" | "admin" | "member";
  initialMessages: RoomMessageView[];
};

export function RoomChat({
  roomId,
  roomName,
  roomSlug,
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
    if (!msg.id) {
      return;
    }
    if (seenIdsRef.current.has(msg.id)) {
      return;
    }
    seenIdsRef.current.add(msg.id);
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) {
        return prev;
      }
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
      const [{ data }, { data: membership }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, handle, display_name, avatar_url")
          .eq("id", senderProfileId)
          .maybeSingle(),
        supabase
          .from("room_memberships")
          .select("role")
          .eq("room_id", roomId)
          .eq("profile_id", senderProfileId)
          .maybeSingle(),
      ]);
      const p = data as {
        id: string;
        handle: string;
        display_name: string;
        avatar_url: string | null;
      } | null;
      const m = membership as { role: "owner" | "admin" | "member" } | null;
      return {
        profile_id: senderProfileId,
        handle: p?.handle ?? "?",
        display_name: p?.display_name ?? "Unknown",
        avatar_url: p?.avatar_url ?? null,
        role: m?.role ?? null,
      };
    },
    [roomId],
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
          if (!row?.id || seenIdsRef.current.has(row.id)) {
            return;
          }
          let sender: RoomMessageView["sender"];
          try {
            const loaded = await fetchSender(row.sender_profile_id);
            sender = loaded ?? {
              profile_id: row.sender_profile_id,
              handle: "?",
              display_name: "Member",
              avatar_url: null,
              role: null,
            };
          } catch {
            sender = {
              profile_id: row.sender_profile_id,
              handle: "?",
              display_name: "Member",
              avatar_url: null,
              role: null,
            };
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

  async function sendCurrentMessage() {
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not send message.";
      setSendError(message);
    } finally {
      setSending(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    await sendCurrentMessage();
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
    <section className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md shadow-zinc-200/40 ring-1 ring-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/90 px-4 py-2.5 text-[11px] text-zinc-600">
        <p>
          Harassment, spam, and illegal content are not allowed. Owners and admins can remove
          messages; serious issues can be escalated to the platform.
        </p>
        <div className="shrink-0">
          <InlineReportControl
            targetKind="room"
            targetId={roomId}
            label="Report room"
          />
        </div>
      </div>
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Chat
        </h2>
        <p className="text-[10px] text-zinc-600">
          {roomName} · /{roomSlug} · Live for members only
        </p>
      </div>

      {realtimeError ? (
          <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          {realtimeError}
        </p>
      ) : null}

      <div
        className="max-h-[min(440px,55vh)] min-h-[220px] overflow-y-auto bg-zinc-50/80 px-4 py-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center">
            <p className="text-sm font-medium text-zinc-500">No messages yet</p>
            <p className="mt-1 text-xs text-zinc-600">
              Open the conversation with a set recap, flyer drop, or booking update.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => {
              const isOwn = m.sender.profile_id === viewerProfileId;
              const showDelete = isOwn || canModerate;
              return (
                <li
                  key={m.id}
                  className={`flex gap-2 text-sm ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isOwn ? (
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-200">
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
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="font-medium text-zinc-900">
                        {m.sender.display_name}
                      </span>
                      <Link
                        href={profilePublicPath(m.sender.handle)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-800"
                      >
                        @{m.sender.handle}
                      </Link>
                      <span className="text-[10px] text-zinc-600">
                        {formatMsgTime(m.created_at)}
                      </span>
                      {m.sender.role === "owner" || m.sender.role === "admin" ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                          Announcement
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-1 w-fit max-w-full whitespace-pre-wrap break-words rounded-2xl px-3 py-2 ${
                        isOwn
                          ? "ml-auto bg-amber-100 text-zinc-900 ring-1 ring-amber-200"
                          : "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200"
                      }`}
                    >
                      {m.body}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {showDelete ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id)}
                          className="text-[10px] text-zinc-600 hover:text-red-600"
                        >
                          {isOwn ? "Delete" : "Remove"}
                        </button>
                      ) : null}
                      {!isOwn ? (
                        <InlineReportControl
                          targetKind="room_message"
                          targetId={m.id}
                          label="Report"
                        />
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-zinc-100 p-3">
        {sendError ? (
          <p className="mb-2 text-xs text-red-600" role="alert">
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = body.trim();
              if (!sending && text.length > 0) {
                void sendCurrentMessage();
              }
            }
          }}
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200 disabled:opacity-50"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[10px] text-zinc-600">
            Enter to send, Shift+Enter for newline
          </span>
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="min-h-11 min-w-[5.25rem] shrink-0 rounded-full bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
