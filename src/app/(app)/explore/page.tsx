import Link from "next/link";
import { redirect } from "next/navigation";

import { DiscoverSearchForm } from "@/components/discover/discover-search-form";
import { DjPreviewCard } from "@/components/explore/dj-preview-card";
import { FeedList } from "@/components/feed/feed-list";
import { RoomPreviewCard } from "@/components/rooms/room-preview-card";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  discoveryRisingProfiles,
  discoveryTrendingFeed,
  listTaxonomyForFilters,
  resolveTaxonomyIdsFromSlugs,
  sanitizeDiscoveryQuery,
  searchPostsForDiscovery,
  searchProfiles,
  searchRooms,
  suggestRooms,
} from "@/lib/discovery/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function exploreHref(params: {
  q?: string;
  city?: string;
  genre?: string;
  djType?: string;
}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.city) sp.set("city", params.city);
  if (params.genre) sp.set("genre", params.genre);
  if (params.djType) sp.set("djType", params.djType);
  const qs = sp.toString();
  return qs ? `${ROUTES.explore}?${qs}` : ROUTES.explore;
}

export default async function ExplorePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const citySlug = typeof sp.city === "string" ? sp.city : "";
  const genreSlug = typeof sp.genre === "string" ? sp.genre : "";
  const djTypeSlug = typeof sp.djType === "string" ? sp.djType : "";

  const taxonomy = await listTaxonomyForFilters();
  const { cityId, genreId, djTypeId } = await resolveTaxonomyIdsFromSlugs({
    citySlug: citySlug || undefined,
    genreSlug: genreSlug || undefined,
    djTypeSlug: djTypeSlug || undefined,
  });

  const hasQuery = sanitizeDiscoveryQuery(q).length > 0;
  const activeSearch =
    hasQuery || Boolean(cityId) || Boolean(genreId) || Boolean(djTypeId);

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
    !activeSearch ? discoveryTrendingFeed(profile.id, 12) : Promise.resolve([]),
    !activeSearch
      ? discoveryRisingProfiles(null, 10)
      : Promise.resolve([]),
    !activeSearch
      ? suggestRooms(null, profile.id, 10)
      : Promise.resolve([]),
  ]);

  const emptySearchResults =
    activeSearch &&
    profileHits.length === 0 &&
    roomHits.length === 0 &&
    postHits.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
      <AppPageHeader
        eyebrow="Discover"
        title="Explore"
        subtitle="Hunt DJs, rooms, cities, and genres—then dive into what’s moving this week."
      />

      <DiscoverSearchForm
        action={ROUTES.explore}
        defaultQuery={q}
        taxonomy={taxonomy}
        defaultCitySlug={citySlug}
        defaultGenreSlug={genreSlug}
        defaultDjTypeSlug={djTypeSlug}
      />

      {activeSearch ? (
        <section className="space-y-10">
          <SectionHeader title="Results" />

          {emptySearchResults ? (
            <EmptyState
              title="No matches"
              description="Shorten the query, reset a filter, or browse cities and trending modules below when you clear search."
            />
          ) : null}

          {profileHits.length > 0 ? (
            <div className="space-y-4">
              <SectionHeader
                eyebrow="People"
                title={`DJs & profiles · ${profileHits.length}`}
              />
              <ul className="grid gap-3 sm:grid-cols-2">
                {profileHits.map((p) => (
                  <li key={p.id}>
                    <DjPreviewCard profile={p} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {roomHits.length > 0 ? (
            <div className="space-y-4">
              <SectionHeader
                eyebrow="Spaces"
                title={`Rooms · ${roomHits.length}`}
              />
              <ul className="grid gap-3 sm:grid-cols-2">
                {roomHits.map((r) => (
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
            </div>
          ) : null}

          {hasQuery && postHits.length > 0 ? (
            <div className="space-y-4">
              <SectionHeader
                eyebrow="Posts"
                title={`Caption matches · ${postHits.length}`}
              />
              <FeedList items={postHits} currentProfileId={profile.id} />
            </div>
          ) : null}

          {hasQuery && postHits.length === 0 && !emptySearchResults ? (
            <p className="text-xs text-zinc-600">
              No post captions matched. Try different keywords or scroll the Home
              feed.
            </p>
          ) : null}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Trending</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{trending.length}</p>
              <p className="text-xs text-zinc-600">Posts with momentum this week</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Rising</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{rising.length}</p>
              <p className="text-xs text-zinc-600">DJs climbing activity rankings</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Rooms</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{roomSuggestions.length}</p>
              <p className="text-xs text-zinc-600">Public spaces worth joining now</p>
            </div>
          </section>

          <section className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <SectionHeader
                eyebrow="Momentum"
                title="Trending clips & posts"
                description="Last 7 days, ranked by real likes—ties break to newer."
              />
              {trending.length === 0 ? (
                <EmptyState title="Nothing trending yet" description="Post from Home and gather likes to surface here." />
              ) : (
                <FeedList items={trending} currentProfileId={profile.id} />
              )}
            </div>

            <div className="space-y-4">
              <SectionHeader
                eyebrow="Scene"
                title="Rising DJs"
                description="Most posts in the last 14 days—global signal."
              />
              {rising.length === 0 ? (
                <EmptyState title="Quiet window" description="Check back as more DJs post this month." />
              ) : (
                <ul className="grid gap-3">
                  {rising.map((p) => (
                    <li key={p.id}>
                      <DjPreviewCard profile={p} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="Rooms"
              title="Suggested spaces"
              description="Public rooms with the most members—jump in, then keep the chat in Rooms."
            />
            {roomSuggestions.length === 0 ? (
              <EmptyState title="No public rooms yet" description="Create one under Rooms and invite your scene." />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {roomSuggestions.map((r) => (
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
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="Genres"
              title="Browse by sound"
              description="Jump into a genre lane and discover DJs + rooms filtered to that taste."
            />
            <ul className="flex flex-wrap gap-2">
              {taxonomy.genres.slice(0, 18).map((g) => (
                <li key={g.id}>
                  <Link
                    href={exploreHref({ city: citySlug || undefined, genre: g.slug })}
                    className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-amber-300 hover:text-amber-900"
                  >
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="Roles"
              title="Browse by DJ type"
              description="Producers, club DJs, mobile crews, and more."
            />
            <ul className="flex flex-wrap gap-2">
              {taxonomy.djTypes.slice(0, 12).map((d) => (
                <li key={d.id}>
                  <Link
                    href={exploreHref({
                      city: citySlug || undefined,
                      genre: genreSlug || undefined,
                      djType: d.slug,
                    })}
                    className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-amber-300 hover:text-amber-900"
                  >
                    {d.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 border-t border-zinc-200 pt-10">
            <SectionHeader
              eyebrow="Cities"
              title="Browse by city"
              description="Hyperlocal scenes—each city page scopes DJs, rooms, and trending to that metro."
            />
            <ul className="flex flex-wrap gap-2">
              {taxonomy.cities.slice(0, 20).map((c) => (
                <li key={c.id}>
                  <Link
                    href={ROUTES.exploreCity(c.slug)}
                    className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-100 transition hover:border-amber-300 hover:text-amber-900"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
