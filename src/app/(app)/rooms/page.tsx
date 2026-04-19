import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROOM_TYPE_LABELS, ROOM_VISIBILITY_LABELS } from "@/lib/rooms/constants";
import type { RoomType, RoomVisibility } from "@/lib/rooms/constants";
import { listVisibleRooms } from "@/lib/rooms/queries";
import { ROUTES } from "@/lib/routes";

export default async function RoomsDirectoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const rooms = await listVisibleRooms();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Rooms
          </h1>
          <p className="mt-1 max-w-prose text-sm text-[var(--muted)]">
            Communities by city, crew, or topic. Public rooms are open to join; private rooms
            appear here only when you are a member.
          </p>
        </div>
        <Link
          href={ROUTES.roomsNew}
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
        >
          Create room
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 py-14 text-center">
          <p className="text-sm text-zinc-400">No rooms yet.</p>
          <p className="mt-2 text-xs text-zinc-600">
            Create the first room to gather DJs around a city, crew, or topic.
          </p>
          <Link
            href={ROUTES.roomsNew}
            className="mt-4 inline-block text-sm font-medium text-zinc-300 hover:text-white"
          >
            Create a room →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rooms.map((r) => (
            <li key={r.id}>
              <Link
                href={ROUTES.room(r.slug)}
                className="block rounded-lg border border-[var(--border)] bg-zinc-950/40 px-4 py-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900/40"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-100">{r.name}</span>
                  <span className="text-xs text-zinc-500">
                    {ROOM_VISIBILITY_LABELS[r.visibility as RoomVisibility]} ·{" "}
                    {ROOM_TYPE_LABELS[r.room_type as RoomType]}
                  </span>
                </div>
                {r.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{r.description}</p>
                ) : null}
                <p className="mt-2 text-[11px] text-zinc-600">
                  /{r.slug} · {r.member_count}{" "}
                  {r.member_count === 1 ? "member" : "members"}
                  {r.creator_handle ? (
                    <>
                      {" "}
                      · created by @{r.creator_handle}
                    </>
                  ) : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
