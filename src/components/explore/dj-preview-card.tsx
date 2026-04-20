import Image from "next/image";
import Link from "next/link";

import { profilePublicPath } from "@/lib/profile/paths";
import type { ProfileRow } from "@/types/database";

export function DjPreviewCard({
  profile,
  subtitle,
}: {
  profile: Pick<ProfileRow, "id" | "handle" | "display_name" | "avatar_url">;
  /** City name, genre chip, etc. */
  subtitle?: string | null;
}) {
  return (
    <Link
      href={profilePublicPath(profile.handle)}
      className="group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 ring-1 ring-zinc-100 transition hover:border-amber-200 hover:bg-amber-50/50"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-2 ring-zinc-100">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
            {profile.display_name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-900 group-hover:text-amber-900">
          {profile.display_name}
        </p>
        <p className="truncate text-xs text-zinc-500">@{profile.handle}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[11px] text-zinc-600">{subtitle}</p>
        ) : null}
      </div>
    </Link>
  );
}
