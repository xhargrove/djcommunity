import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { linksFromJson } from "@/lib/profile/links";
import { getProfilePublicViewByHandle } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw).toLowerCase();
  const view = await getProfilePublicViewByHandle(handle);
  if (!view) {
    return { title: "Profile" };
  }
  return {
    title: `${view.profile.display_name} (@${view.profile.handle})`,
    description:
      view.profile.bio?.slice(0, 160) ??
      `DJ profile @${view.profile.handle}`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw).toLowerCase();
  const view = await getProfilePublicViewByHandle(handle);
  if (!view) {
    notFound();
  }

  const { profile, cityName, djTypeLabel, genres } = view;
  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === profile.user_id;
  const links = linksFromJson(profile.links);

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <div className="relative h-40 w-full overflow-hidden bg-zinc-900 sm:h-52">
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
          <div className="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-950" />
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-0 sm:px-6">
        <div className="-mt-14 flex flex-col gap-6 sm:-mt-16 sm:flex-row sm:items-end sm:gap-8">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--background)] bg-zinc-900 sm:h-32 sm:w-32">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={128}
                height={128}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-500">
                {profile.display_name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2 pb-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                {profile.display_name}
              </h1>
              <span className="text-sm text-zinc-500">@{profile.handle}</span>
            </div>
            <p className="text-sm text-zinc-400">
              {djTypeLabel}
              {cityName ? (
                <>
                  {" "}
                  · {cityName}
                </>
              ) : null}
            </p>
            {isOwner ? (
              <Link
                href={ROUTES.profileEdit}
                className="w-fit text-sm font-medium text-zinc-300 underline underline-offset-4 hover:text-white"
              >
                Edit your profile
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-10 space-y-8">
          {genres.length > 0 ? (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Genres
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {genres.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-full border border-[var(--border)] bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300"
                  >
                    {g.label}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-zinc-500">No genres listed.</p>
          )}

          {profile.bio ? (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Bio
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {profile.bio}
              </p>
            </section>
          ) : (
            <p className="text-sm text-zinc-500">No bio yet.</p>
          )}

          {profile.gear_setup ? (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Gear
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {profile.gear_setup}
              </p>
            </section>
          ) : (
            <p className="text-sm text-zinc-500">No gear listed.</p>
          )}

          {profile.featured_mix_link ? (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Featured mix
              </h2>
              <a
                href={profile.featured_mix_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-zinc-200 underline hover:text-white"
              >
                {profile.featured_mix_link}
              </a>
            </section>
          ) : (
            <p className="text-sm text-zinc-500">No featured mix linked.</p>
          )}

          {profile.booking_contact ? (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Booking / inquiries
              </h2>
              <p className="mt-2 text-sm text-zinc-300">{profile.booking_contact}</p>
            </section>
          ) : (
            <p className="text-sm text-zinc-500">No booking contact listed.</p>
          )}

          {links.length > 0 ? (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Links
              </h2>
              <ul className="mt-2 space-y-2">
                {links.map((link, i) => (
                  <li key={`${link.url}-${i}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-zinc-200 underline hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-zinc-500">No links yet.</p>
          )}
        </div>

        <div className="mt-12 border-t border-[var(--border)] pt-6">
          <Link
            href={ROUTES.root}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Back
          </Link>
        </div>
      </div>
    </div>
  );
}
