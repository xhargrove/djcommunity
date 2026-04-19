"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteRoomAction,
  inviteMemberAction,
  joinRoomAction,
  leaveRoomAction,
} from "@/actions/rooms";
import { ROUTES } from "@/lib/routes";

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
              router.refresh();
            }
          });
        }}
        className="w-fit rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
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
        className="w-fit rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
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
        className="w-fit rounded-md border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm text-red-200 hover:bg-red-950/50 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete room"}
      </button>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
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
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !handle.trim()}
        className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
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
