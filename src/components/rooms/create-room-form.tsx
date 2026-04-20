"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { createRoomAction } from "@/actions/rooms";
import {
  ROOM_TYPE_LABELS,
  ROOM_TYPES,
  ROOM_VISIBILITY_LABELS,
  ROOM_VISIBILITIES,
  type RoomType,
  type RoomVisibility,
} from "@/lib/rooms/constants";
import type { CityRow } from "@/types/database";
import { PRODUCT_EVENTS } from "@/lib/analytics/events";
import { trackProductEvent } from "@/lib/analytics/track-client";
import { ROUTES } from "@/lib/routes";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create room"}
    </button>
  );
}

export function CreateRoomForm({ cities }: { cities: CityRow[] }) {
  const router = useRouter();
  const [state, formAction] = useActionState(createRoomAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      trackProductEvent(PRODUCT_EVENTS.ROOM_CREATED, { slug: state.slug });
      router.push(ROUTES.room(state.slug));
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mx-auto max-w-lg space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-xs font-medium text-zinc-400">
          Room name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-zinc-900"
          placeholder="e.g. Atlanta open-format DJs"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="slug" className="text-xs font-medium text-zinc-400">
          URL slug
        </label>
        <input
          id="slug"
          name="slug"
          maxLength={64}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-zinc-900"
          placeholder="Leave blank to derive from name"
        />
        <p className="text-[11px] text-zinc-600">
          Lowercase letters, numbers, hyphens. Appears as /rooms/your-slug
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="text-xs font-medium text-zinc-400">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-zinc-900"
          placeholder="What is this room for?"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="visibility" className="text-xs font-medium text-zinc-400">
          Visibility
        </label>
        <select
          id="visibility"
          name="visibility"
          required
          defaultValue="public"
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-zinc-900"
        >
          {ROOM_VISIBILITIES.map((v: RoomVisibility) => (
            <option key={v} value={v}>
              {ROOM_VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-zinc-600">
          Private rooms only appear to members. Join by invitation from an owner or admin.
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor="room_type" className="text-xs font-medium text-zinc-400">
          Room type
        </label>
        <select
          id="room_type"
          name="room_type"
          required
          defaultValue="topic"
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-zinc-900"
        >
          {ROOM_TYPES.map((t: RoomType) => (
            <option key={t} value={t}>
              {ROOM_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="city_id" className="text-xs font-medium text-zinc-400">
          City (required for city rooms)
        </label>
        <select
          id="city_id"
          name="city_id"
          defaultValue=""
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-zinc-900"
        >
          <option value="">— None —</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.region ? `, ${c.region}` : ""}
            </option>
          ))}
        </select>
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
