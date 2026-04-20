"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  deleteRoomAction,
  inviteMemberAction,
  joinRoomAction,
  leaveRoomAction,
  updateRoomVisibilityAction,
} from "@/actions/rooms";
import {
  ROOM_VISIBILITY_LABELS,
  ROOM_VISIBILITIES,
  type RoomVisibility,
} from "@/lib/rooms/constants";
import { PRODUCT_EVENTS } from "@/lib/analytics/events";
import { trackProductEvent } from "@/lib/analytics/track-client";
import { ROUTES } from "@/lib/routes";

const primaryBtn =
  "w-fit rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-amber-900/10 transition hover:bg-amber-700 disabled:opacity-50";
const secondaryBtn =
  "w-fit rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50";
const dangerBtn =
  "w-fit rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-50";

export function JoinRoomButton({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await joinRoomAction(roomId);
            if (!r.ok) {
              setError(r.error);
            } else {
              trackProductEvent(PRODUCT_EVENTS.ROOM_JOINED, { room_id: roomId });
              router.refresh();
            }
          });
        }}
        className={primaryBtn}
      >
        {pending ? "Joining…" : "Join room"}
      </button>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LeaveRoomButton({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await leaveRoomAction(roomId);
            if (!r.ok) {
              setError(r.error);
            } else {
              router.push(ROUTES.rooms);
              router.refresh();
            }
          });
        }}
        className={secondaryBtn}
      >
        {pending ? "Leaving…" : "Leave room"}
      </button>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DeleteRoomButton({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Delete this room permanently? All memberships will be removed.")) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const r = await deleteRoomAction(roomId);
            if (!r.ok) {
              setError(r.error);
            } else {
              router.push(ROUTES.rooms);
              router.refresh();
            }
          });
        }}
        className={dangerBtn}
      >
        {pending ? "Deleting…" : "Delete room"}
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RoomVisibilityControl({
  roomId,
  currentVisibility,
}: {
  roomId: string;
  currentVisibility: RoomVisibility;
}) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<RoomVisibility>(currentVisibility);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setVisibility(currentVisibility);
  }, [currentVisibility]);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label htmlFor="room-visibility" className="text-xs font-medium text-zinc-600">
          Who can find this room
        </label>
        <p className="text-[11px] text-zinc-500">
          Public rooms appear in Explore and anyone signed in can join. Private rooms are invite-only
          (you and admins can still invite members below).
        </p>
        <select
          id="room-visibility"
          value={visibility}
          disabled={pending}
          onChange={(e) => setVisibility(e.target.value as RoomVisibility)}
          className="mt-1 w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200 disabled:opacity-50"
        >
          {ROOM_VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {ROOM_VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={pending || visibility === currentVisibility}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await updateRoomVisibilityAction(roomId, visibility);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            router.refresh();
          });
        }}
        className={secondaryBtn}
      >
        {pending ? "Saving…" : "Save visibility"}
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function InviteMemberForm({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await inviteMemberAction(roomId, handle);
          if (!r.ok) {
            setError(r.error);
          } else {
            setHandle("");
            router.refresh();
          }
        });
      }}
    >
      <div className="min-w-[12rem] flex-1 space-y-1">
        <label htmlFor="invite-handle" className="text-[10px] font-medium text-zinc-500">
          Invite by handle
        </label>
        <input
          id="invite-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@handle"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !handle.trim()}
        className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
      >
        {pending ? "…" : "Invite"}
      </button>
      {error ? (
        <p className="w-full text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
