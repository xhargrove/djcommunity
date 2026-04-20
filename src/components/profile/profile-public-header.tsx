import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ProfileRow } from "@/types/database";

type ProfilePublicHeaderProps = {
  profile: ProfileRow;
  cityName: string;
  djTypeLabel: string;
  genres: { id: string; label: string }[];
  followers: number;
  following: number;
  actions: ReactNode;
};

export function ProfilePublicHeader({
  profile,
  cityName,
  djTypeLabel,
  genres,
  followers,
  following,
  actions,
}: ProfilePublicHeaderProps) {
  return (
    <>
      <div className="relative h-44 w-full overflow-hidden sm:h-52">
        {profile.banner_url ? (
          <Image
            src={profile.banner_url}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-amber-100 via-zinc-100 to-zinc-200" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent" />
      </div>

      <div className="relative -mt-16 px-4 sm:px-0">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-4 border-[var(--background)] bg-zinc-100 shadow-xl shadow-zinc-300/40 ring-1 ring-zinc-200 sm:h-32 sm:w-32">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={128}
                height={128}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-zinc-500">
                {profile.display_name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3 pb-1">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                {profile.display_name}
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500">@{profile.handle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {djTypeLabel ? (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-800">
                  {djTypeLabel}
                </span>
              ) : null}
              {cityName ? (
                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                  {cityName}
                </span>
              ) : null}
            </div>
            {genres.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {genres.slice(0, 8).map((g) => (
                  <li
                    key={g.id}
                    className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-900"
                  >
                    {g.label}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-zinc-500">
              <span className="tabular-nums font-medium text-zinc-900">
                {followers}
              </span>{" "}
              followers
              <span className="mx-2 text-zinc-400">·</span>
              <span className="tabular-nums font-medium text-zinc-900">
                {following}
              </span>{" "}
              following
            </p>
            <div className="pt-1">{actions}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export function ProfileBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center text-sm text-zinc-600 transition hover:text-zinc-900"
    >
      ← {label}
    </Link>
  );
}
