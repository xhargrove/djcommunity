import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DiscoverSearchForm } from "@/components/discover/discover-search-form";
import { DjPreviewCard } from "@/components/explore/dj-preview-card";
import { FeedList } from "@/components/feed/feed-list";
import { RoomPreviewCard } from "@/components/rooms/room-preview-card";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
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
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  params: Promise<{ citySlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function cityExploreHref(citySlug: string, params: { q?: string; genre?: string; djType?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.genre) sp.set("genre", params.genre);
  if (params.djType) sp.set("djType", params.djType);
  const qs = sp.toString();
  return qs ? `${ROUTES.exploreCity(citySlug)}?${qs}` : ROUTES.exploreCity(citySlug);
}

export default async function ExploreCityPage({ params, searchParams }: PageProps) {
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

  const actionPath = ROUTES.exploreCity(city.slug);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
      <div>
        <p className="text-xs text-zinc-500">
          <Link href={ROUTES.explore} className="hover:text-zinc-300">
            Explore
          </Link>
          <span className="mx-1 text-zinc-700">/</span>
          <span className="text-zinc-400">{city.name}</span>
        </p>
        <div className="mt-3">
          <AppPageHeader
            eyebrow="City scene"
            title={city.name}
            subtitle="DJs, rooms, and momentum scoped to this metro—trending and rising use real activity from here."
          />
        </div>
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
        <section className="space-y-10">
          <SectionHeader title={`Results in ${city.name}`} />

          {emptySearchResults ? (
            <EmptyState
              title="No matches in this city"
              description="Broaden your search or clear filters—then try another city from Explore."
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
              No post captions matched in this city for that query.
            </p>
          ) : null}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Trending</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{trending.length}</p>
              <p className="text-xs text-zinc-600">Posts moving in {city.name}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Rising DJs</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{rising.length}</p>
              <p className="text-xs text-zinc-600">Most active in this metro</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Rooms</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{roomSuggestions.length}</p>
              <p className="text-xs text-zinc-600">Public spaces in this city</p>
            </div>
          </section>

          <section className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <SectionHeader
                eyebrow="Momentum"
                title="Trending in this city"
                description="Last 7 days of likes on posts from DJs tagged here."
              />
              {trending.length === 0 ? (
                <EmptyState
                  title="Nothing trending yet"
                  description="Gather likes on posts from this city to surface here."
                />
              ) : (
                <FeedList items={trending} currentProfileId={profile.id} />
              )}
            </div>

            <div className="space-y-4">
              <SectionHeader
                eyebrow="Scene"
                title={`Rising DJs in ${city.name}`}
                description="Most posts in the last 14 days from this metro."
              />
              {rising.length === 0 ? (
                <EmptyState
                  title="Quiet in this city"
                  description="Check back as more DJs post from here."
                />
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
              title={`Rooms in ${city.name}`}
              description="Public rooms tagged with this city—sorted by members."
            />
            {roomSuggestions.length === 0 ? (
              <EmptyState
                title="No public rooms for this city yet"
                description="Create one under Rooms and tag this metro."
              />
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
              title={`What ${city.name} is playing`}
              description="Filter this city by genre to keep exploring scene-specific pockets."
            />
            <ul className="flex flex-wrap gap-2">
              {taxonomy.genres.slice(0, 16).map((g) => (
                <li key={g.id}>
                  <Link
                    href={cityExploreHref(city.slug, { genre: g.slug, djType: djTypeSlug || undefined })}
                    className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-amber-300 hover:text-amber-900"
                  >
                    {g.label}
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
