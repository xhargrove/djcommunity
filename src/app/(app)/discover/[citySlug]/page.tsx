import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DiscoverSearchForm } from "@/components/discover/discover-search-form";
import { FeedList } from "@/components/feed/feed-list";
import {
  discoveryRisingProfiles,
  discoveryTrendingFeedForCity,
  getCityBySlug,
  listTaxonomyForFilters,
  resolveTaxonomyIdsFromSlugs,
  sanitizeDiscoveryQuery,
  searchPostsForDiscovery,
  searchProfiles,
  searchRooms,
  suggestRooms,
} from "@/lib/discovery/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { profilePublicPath } from "@/lib/profile/paths";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  params: Promise<{ citySlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiscoverCityPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const { citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) {
    notFound();
  }

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const genreSlug = typeof sp.genre === "string" ? sp.genre : "";
  const djTypeSlug = typeof sp.djType === "string" ? sp.djType : "";

  const taxonomy = await listTaxonomyForFilters();
  const { genreId, djTypeId } = await resolveTaxonomyIdsFromSlugs({
    genreSlug: genreSlug || undefined,
    djTypeSlug: djTypeSlug || undefined,
  });

  const cityId = city.id;
  const hasQuery = sanitizeDiscoveryQuery(q).length > 0;
  const activeSearch =
    hasQuery || Boolean(genreId) || Boolean(djTypeId);

  const [
    profileHits,
    roomHits,
    postHits,
    trending,
    rising,
    roomSuggestions,
  ] = await Promise.all([
    activeSearch
      ? searchProfiles({
          q,
          cityId,
          genreId,
          djTypeId,
          limit: 24,
        })
      : Promise.resolve([]),
    activeSearch
      ? searchRooms({
          q,
          cityId,
          viewerProfileId: profile.id,
          limit: 24,
        })
      : Promise.resolve([]),
    activeSearch && hasQuery
      ? searchPostsForDiscovery({
          q,
          cityId,
          genreId,
          djTypeId,
          limit: 15,
          viewerProfileId: profile.id,
        })
      : Promise.resolve([]),
    !activeSearch
      ? discoveryTrendingFeedForCity(cityId, profile.id, 12)
      : Promise.resolve([]),
    !activeSearch
      ? discoveryRisingProfiles(cityId, 10)
      : Promise.resolve([]),
    !activeSearch
      ? suggestRooms(cityId, profile.id, 10)
      : Promise.resolve([]),
  ]);

  const emptySearchResults =
    activeSearch &&
    profileHits.length === 0 &&
    roomHits.length === 0 &&
    postHits.length === 0;

  const actionPath = ROUTES.discoverCity(city.slug);

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">
          <Link href={ROUTES.discover} className="hover:text-zinc-300">
            Discover
          </Link>
          <span className="mx-1 text-zinc-700">/</span>
          <span className="text-zinc-400">{city.name}</span>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {city.name}
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-[var(--muted)]">
          DJs, rooms, and activity scoped to this city. Trending posts, rising DJs,
          and suggested rooms use real counts from this metro where applicable.
        </p>
      </div>

      <DiscoverSearchForm
        action={actionPath}
        defaultQuery={q}
        taxonomy={taxonomy}
        lockedCitySlug={city.slug}
        defaultCitySlug={city.slug}
        defaultGenreSlug={genreSlug}
        defaultDjTypeSlug={djTypeSlug}
      />

      {activeSearch ? (
        <section className="space-y-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Results in {city.name}
          </h2>

          {emptySearchResults ? (
            <div className="rounded-lg border border-dashed border-zinc-700 py-12 text-center">
              <p className="text-sm text-zinc-400">No matches in this city.</p>
              <p className="mt-2 text-xs text-zinc-600">
                Broaden your search or try another city from Discover.
              </p>
            </div>
          ) : null}

          {profileHits.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                DJs & profiles ({profileHits.length})
              </h3>
              <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                {profileHits.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={profilePublicPath(p.handle)}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-zinc-900/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {p.display_name}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          @{p.handle}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {roomHits.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Rooms ({roomHits.length})
              </h3>
              <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                {roomHits.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={ROUTES.room(r.slug)}
                      className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-zinc-900/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {r.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          /{r.slug} · {r.member_count} members
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase text-zinc-600">
                        {r.visibility}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasQuery && postHits.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Posts ({postHits.length})
              </h3>
              <FeedList items={postHits} currentProfileId={profile.id} />
            </div>
          ) : null}

          {hasQuery && postHits.length === 0 && !emptySearchResults ? (
            <p className="text-xs text-zinc-600">
              No post captions matched in this city for that query.
            </p>
          ) : null}
        </section>
      ) : (
        <>
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Trending posts
              </h2>
              <p className="text-xs text-zinc-600">
                Last 7 days from DJs in {city.name}, ranked by real likes.
              </p>
              {trending.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Nothing trending yet — gather likes on your posts from Home.
                </p>
              ) : (
                <FeedList items={trending} currentProfileId={profile.id} />
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Rising DJs in {city.name}
              </h2>
              <p className="text-xs text-zinc-600">
                Most posts in the last 14 days in this city.
              </p>
              {rising.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No recent posts from DJs here yet.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                  {rising.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={profilePublicPath(p.handle)}
                        className="block px-3 py-2.5 hover:bg-zinc-900/50"
                      >
                        <span className="text-sm font-medium text-zinc-100">
                          {p.display_name}
                        </span>
                        <span className="ml-2 text-xs text-zinc-500">
                          @{p.handle}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Rooms in {city.name}
            </h2>
            <p className="text-xs text-zinc-600">
              Public rooms tagged with this city, by members then recency.
            </p>
            {roomSuggestions.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No public rooms for this city yet.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                {roomSuggestions.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={ROUTES.room(r.slug)}
                      className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-zinc-900/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {r.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {r.member_count} members
                          {r.creator_handle
                            ? ` · by @${r.creator_handle}`
                            : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
