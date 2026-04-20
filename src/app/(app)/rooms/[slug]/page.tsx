import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  DeleteRoomButton,
  InviteMemberForm,
  JoinRoomButton,
  LeaveRoomButton,
  RoomVisibilityControl,
} from "@/components/rooms/room-actions";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { getCurrentUser } from "@/lib/auth/session";
import { profilePublicPath } from "@/lib/profile/paths";
import { getProfileByUserId } from "@/lib/profile/queries";
import {
  ROOM_TYPE_LABELS,
  ROOM_VISIBILITY_LABELS,
} from "@/lib/rooms/constants";
import type { RoomType, RoomVisibility } from "@/lib/rooms/constants";
import { RoomChat } from "@/components/rooms/room-chat";
import { listRoomMessages } from "@/lib/rooms/messages-queries";
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

function safeDecodeSlug(raw: string): string | null {
  try {
    const value = decodeURIComponent(raw).toLowerCase();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export default async function RoomDetailPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = safeDecodeSlug(raw);
  if (!slug) {
    notFound();
  }

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
  const initialMessages = isMember ? await listRoomMessages(room.id) : [];
  const cityName =
    room.city_id && room.room_type === "city"
      ? await getCityName(room.city_id)
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="space-y-3">
        <Link
          href={ROUTES.rooms}
          className="text-xs text-zinc-600 hover:text-zinc-900"
        >
          ← Rooms
        </Link>
        <AppPageHeader
          eyebrow="Room"
          title={room.name}
          subtitle={
            room.description ??
            "Community chat space for your city, crew, or topic."
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
            {ROOM_VISIBILITY_LABELS[room.visibility as RoomVisibility]}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
            {ROOM_TYPE_LABELS[room.room_type as RoomType]}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] text-zinc-600">
            /{room.slug}
          </span>
          {cityName ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] text-zinc-600">
              {cityName}
            </span>
          ) : null}
          {membership ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] text-amber-900">
              Role: {membership.role}
            </span>
          ) : null}
        </div>
      </div>

      <section className="flex flex-wrap gap-4 border-y border-zinc-200 py-4 text-sm text-zinc-600">
        <span>
          <span className="tabular-nums font-medium text-zinc-900">{room.member_count}</span>{" "}
          {room.member_count === 1 ? "member" : "members"}
        </span>
      </section>

      {!isMember && room.visibility === "public" ? (
        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 ring-1 ring-zinc-100">
          <SectionHeader
            title="Join this room"
            description="Public room: join to unlock live chat and member visibility."
          />
          <div className="pt-1">
            <JoinRoomButton roomId={room.id} />
          </div>
        </section>
      ) : null}

      {isMember && membership ? (
        <>
          <RoomChat
            roomId={room.id}
            roomName={room.name}
            roomSlug={room.slug}
            viewerProfileId={profile.id}
            viewerRole={membership.role as "owner" | "admin" | "member"}
            initialMessages={initialMessages}
          />

          {isAdmin ? (
            <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 ring-1 ring-zinc-100">
              <SectionHeader
                eyebrow="Settings"
                title="Visibility"
                description="Switch between a discoverable public room and a private, invite-only space."
              />
              <RoomVisibilityControl
                roomId={room.id}
                currentVisibility={room.visibility as RoomVisibility}
              />
            </section>
          ) : null}

          {isAdmin ? (
            <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 ring-1 ring-zinc-100">
              <SectionHeader
                eyebrow="Moderation"
                title="Invite members"
                description="Invite by profile handle for private rooms and curated public spaces."
              />
              <InviteMemberForm roomId={room.id} />
            </section>
          ) : null}

          <section className="space-y-3">
            <SectionHeader title="Members" />
            <ul className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 ring-1 ring-zinc-100">
              {members.map((m) => (
                <li
                  key={m.profile_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <div>
                    <span className="text-zinc-900">{m.display_name}</span>{" "}
                    <Link
                      href={profilePublicPath(m.handle)}
                      className="text-xs text-zinc-500 hover:text-zinc-800"
                    >
                      @{m.handle}
                    </Link>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] capitalize text-zinc-600">
                    {m.role}
                  </span>
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

      {!isMember && room.visibility !== "public" ? (
        <EmptyState
          title="Private room"
          description="You need an invite from an owner/admin to enter this room."
        />
      ) : null}
    </div>
  );
}
