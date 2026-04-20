import Link from "next/link";
import { redirect } from "next/navigation";

import { RoomPreviewCard } from "@/components/rooms/room-preview-card";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profile/queries";
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <AppPageHeader
        eyebrow="Community"
        title="Rooms"
        subtitle="Scene-based spaces—by city, crew, or topic. Open rooms are one tap; private ones show when you're a member."
        action={
          <Link
            href={ROUTES.roomsNew}
            className="inline-flex rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-900/15 transition hover:bg-amber-700"
          >
            New room
          </Link>
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          title="No rooms yet"
          description="Start a room for your city night, your crew, or a genre lane—then invite DJs in from Explore."
        >
          <Link
            href={ROUTES.roomsNew}
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Create a room
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rooms.map((r) => (
            <li key={r.id}>
              <RoomPreviewCard
                slug={r.slug}
                name={r.name}
                description={r.description}
                visibility={r.visibility}
                roomType={r.room_type}
                memberCount={r.member_count}
                creatorHandle={r.creator_handle}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
