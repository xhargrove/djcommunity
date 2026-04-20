import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profile/queries";
import { listCitiesOrdered } from "@/lib/taxonomy/queries";
import { ROUTES } from "@/lib/routes";

export default async function NewRoomPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const cities = await listCitiesOrdered();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={ROUTES.rooms}
          className="text-xs text-zinc-600 hover:text-zinc-900"
        >
          ← Rooms
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Create a room
        </h1>
        <p className="mt-1 max-w-prose text-sm text-[var(--muted)]">
          You will be the owner. Add a public room anyone can join, or a private room where
          members are invited by admins.
        </p>
      </div>
      <CreateRoomForm cities={cities} />
    </div>
  );
}
