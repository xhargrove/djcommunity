import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  DeleteRoomButton,
  InviteMemberForm,
  JoinRoomButton,
  LeaveRoomButton,
} from "@/components/rooms/room-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { profilePublicPath } from "@/lib/profile/paths";
import { getProfileByUserId } from "@/lib/profile/queries";
import {
  ROOM_TYPE_LABELS,
  ROOM_VISIBILITY_LABELS,
} from "@/lib/rooms/constants";
import type { RoomType, RoomVisibility } from "@/lib/rooms/constants";
import {
  getCityName,
  getMembership,
  getRoomBySlug,
  listRoomMembers,
} from "@/lib/rooms/queries";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function RoomDetailPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).toLowerCase();

  const user = await getCurrentUser();
  if (!user) {
    redirect(`${ROUTES.login}?next=${encodeURIComponent(ROUTES.room(slug))}`);
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const room = await getRoomBySlug(slug);
  if (!room) {
    notFound();
  }

  const membership = await getMembership(room.id, profile.id);
  const isMember = membership != null;
  const isOwner = membership?.role === "owner";
  const isAdmin = membership?.role === "admin" || isOwner;

  const members = isMember ? await listRoomMembers(room.id) : [];
  const cityName =
    room.city_id && room.room_type === "city"
      ? await getCityName(room.city_id)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={ROUTES.rooms}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Rooms
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {room.name}
          </h1>
          <span className="text-xs text-zinc-500">
            {ROOM_VISIBILITY_LABELS[room.visibility as RoomVisibility]} ·{" "}
            {ROOM_TYPE_LABELS[room.room_type as RoomType]}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-zinc-600">/{room.slug}</p>
        {cityName ? (
          <p className="mt-1 text-sm text-zinc-400">City: {cityName}</p>
        ) : null}
        {membership ? (
          <p className="mt-2 text-xs text-zinc-500">
            Your role:{" "}
            <span className="text-zinc-300 capitalize">{membership.role}</span>
          </p>
        ) : null}
      </div>

      {room.description ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            About
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {room.description}
          </p>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-4 border-y border-[var(--border)] py-4 text-sm text-zinc-500">
        <span>
          <span className="tabular-nums text-zinc-300">{room.member_count}</span>{" "}
          {room.member_count === 1 ? "member" : "members"}
        </span>
      </section>

      {!isMember && room.visibility === "public" ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Join
          </h2>
          <p className="text-sm text-zinc-400">
            This is a public room. Join to see the member list.
          </p>
          <JoinRoomButton roomId={room.id} />
        </section>
      ) : null}

      {isMember ? (
        <>
          {isAdmin ? (
            <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Invite members
              </h2>
              <p className="text-[11px] text-zinc-600">
                Search by profile handle. Works for private rooms and for adding people to
                public rooms.
              </p>
              <InviteMemberForm roomId={room.id} />
            </section>
          ) : null}

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Members
            </h2>
            <ul className="mt-3 space-y-2">
              {members.map((m) => (
                <li
                  key={m.profile_id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <span className="text-zinc-200">{m.display_name}</span>{" "}
                    <Link
                      href={profilePublicPath(m.handle)}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      @{m.handle}
                    </Link>
                  </div>
                  <span className="text-xs capitalize text-zinc-500">{m.role}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-wrap gap-4">
            {!isOwner ? <LeaveRoomButton roomId={room.id} /> : null}
            {isOwner ? <DeleteRoomButton roomId={room.id} /> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
