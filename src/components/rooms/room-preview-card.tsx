import Link from "next/link";

import {
  ROOM_TYPE_LABELS,
  ROOM_VISIBILITY_LABELS,
  type RoomType,
  type RoomVisibility,
} from "@/lib/rooms/constants";
import { ROUTES } from "@/lib/routes";

export function RoomPreviewCard({
  slug,
  name,
  description,
  visibility,
  roomType,
  memberCount,
  creatorHandle,
  href,
}: {
  slug: string;
  name: string;
  description: string | null;
  visibility: string;
  roomType: string;
  memberCount: number;
  creatorHandle: string | null;
  /** Override link target (default: room slug route) */
  href?: string;
}) {
  const v = visibility as RoomVisibility;
  const t = roomType as RoomType;
  const to = href ?? ROUTES.room(slug);
  const isPublic = visibility === "public";

  return (
    <Link
      href={to}
      className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-md shadow-zinc-200/50 ring-1 ring-zinc-100 transition hover:border-amber-300 hover:bg-amber-50/30 hover:ring-amber-100"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight text-zinc-900 group-hover:text-amber-900">
            {name}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
            /{slug}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            isPublic
              ? "bg-emerald-100 text-emerald-800"
              : "bg-violet-100 text-violet-800"
          }`}
        >
          {isPublic ? "Open" : "Private"}
        </span>
      </div>
      {description ? (
        <p className="mt-2 line-clamp-2 text-sm leading-snug text-zinc-500">
          {description}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-zinc-600">No description yet.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-zinc-100 pt-3 text-[11px] text-zinc-600">
        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-700">
          {ROOM_TYPE_LABELS[t] ?? roomType}
        </span>
        <span className="tabular-nums text-zinc-500">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
        {creatorHandle ? (
          <span className="text-zinc-600">
            · <span className="text-zinc-500">@{creatorHandle}</span>
          </span>
        ) : null}
      </div>
      <span className="sr-only">{ROOM_VISIBILITY_LABELS[v]}</span>
    </Link>
  );
}
