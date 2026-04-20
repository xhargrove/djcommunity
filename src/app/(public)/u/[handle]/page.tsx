import Link from "next/link";
import { notFound } from "next/navigation";

import { FollowButton } from "@/components/engagement/follow-button";
import { FeedList } from "@/components/feed/feed-list";
import {
  ProfileBackLink,
  ProfilePublicHeader,
} from "@/components/profile/profile-public-header";
import { SectionHeader } from "@/components/ui/section-header";
import { RoomPreviewCard } from "@/components/rooms/room-preview-card";
import { getCurrentUser } from "@/lib/auth/session";
import { linksFromJson } from "@/lib/profile/links";
import { profilePublicPath } from "@/lib/profile/paths";
import {
  getProfileByUserId,
  getProfilePublicViewByHandle,
} from "@/lib/profile/queries";
import { ProfileTrustSection } from "@/components/trust/profile-trust-section";
import { getPublicRouteRobots } from "@/lib/meta/indexing";
import { getSiteOrigin } from "@/lib/meta/site";
import { listFeedPostsForAuthor } from "@/lib/posts/queries";
import { listRoomsJoinedByProfile } from "@/lib/rooms/queries";
import { getFollowCounts, isFollowing } from "@/lib/social/queries";
import { viewerHasBlockedProfile } from "@/lib/trust/queries";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  params: Promise<{ handle: string }>;
};

function safeDecodeHandle(raw: string): string | null {
  try {
    const value = decodeURIComponent(raw).toLowerCase();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { handle: raw } = await params;
  const handle = safeDecodeHandle(raw);
  if (!handle) {
    return { title: "Profile" };
  }
  const view = await getProfilePublicViewByHandle(handle);
  if (!view) {
    return { title: "Profile" };
  }
  const description =
    view.profile.bio?.slice(0, 160) ??
    `DJ profile @${view.profile.handle}`;
  const site = getSiteOrigin();
  const path = profilePublicPath(handle);
  const canonical = site ? `${site}${path}` : undefined;
  const title = `${view.profile.display_name} (@${view.profile.handle})`;
  const avatar = view.profile.avatar_url;
  const ogImages = avatar
    ? [{ url: avatar, alt: view.profile.display_name }]
    : undefined;

  return {
    title,
    description,
    robots: getPublicRouteRobots(),
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(avatar ? { images: [avatar] } : {}),
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { handle: raw } = await params;
  const handle = safeDecodeHandle(raw);
  if (!handle) {
    notFound();
  }
  const view = await getProfilePublicViewByHandle(handle);
  if (!view) {
    notFound();
  }

  const { profile, cityName, djTypeLabel, genres } = view;
  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === profile.user_id;
  const viewerProfile = viewer ? await getProfileByUserId(viewer.id) : null;
  const followCounts = await getFollowCounts(profile.id);
  const viewerFollowsTarget =
    viewerProfile != null
      ? await isFollowing(viewerProfile.id, profile.id)
      : false;
  const links = linksFromJson(profile.links);
  const profilePath = profilePublicPath(profile.handle);

  const viewerProfileId = viewerProfile?.id ?? null;

  const [authorPosts, joinedRooms, viewerBlockedTarget] = await Promise.all([
    listFeedPostsForAuthor(profile.id, 12, viewerProfileId),
    listRoomsJoinedByProfile(profile.id, 8),
    viewerProfileId != null && viewerProfileId !== profile.id
      ? viewerHasBlockedProfile(viewerProfileId, profile.id)
      : Promise.resolve(false),
  ]);

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <ProfilePublicHeader
        profile={profile}
        cityName={cityName}
        djTypeLabel={djTypeLabel}
        genres={genres}
        followers={followCounts.followers}
        following={followCounts.following}
        actions={
          isOwner ? (
            <Link
              href={ROUTES.profileEdit}
              className="inline-flex rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            >
              Edit profile
            </Link>
          ) : viewerBlockedTarget ? (
            <span className="text-xs font-medium text-zinc-500">
              You blocked this account — unblock below.
            </span>
          ) : (
            <FollowButton
              targetProfileId={profile.id}
              initialFollowing={viewerFollowsTarget}
              viewerProfileId={viewerProfile?.id ?? null}
              isLoggedIn={!!viewer}
              loginNextPath={profilePath}
            />
          )
        }
      />

      <div className="mx-auto max-w-2xl space-y-12 px-4 pb-24 pt-8 sm:px-6">
        {viewerProfileId != null && !isOwner ? (
          <ProfileTrustSection
            targetProfileId={profile.id}
            viewerProfileId={viewerProfileId}
            initiallyBlocked={viewerBlockedTarget}
          />
        ) : null}

        {profile.bio ? (
          <section className="space-y-2">
            <SectionHeader title="Bio" />
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {profile.bio}
            </p>
          </section>
        ) : null}

        {joinedRooms.length > 0 ? (
          <section className="space-y-4">
            <SectionHeader
              eyebrow="Community"
              title={isOwner ? "Rooms you're in" : "Rooms"}
              description={
                isOwner
                  ? "Spaces you've joined—tap through to chat."
                  : "Public rooms and shared spaces this profile is part of (private rooms stay private)."
              }
            />
            <ul className="grid gap-3 sm:grid-cols-2">
              {joinedRooms.map((r) => (
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
          </section>
        ) : null}

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Feed"
            title="Posts"
            description="Recent drops from this DJ."
          />
          <FeedList items={authorPosts} currentProfileId={viewerProfileId} />
        </section>

        {profile.featured_mix_link ? (
          <section className="space-y-2">
            <SectionHeader title="Featured mix" />
            <a
              href={profile.featured_mix_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex break-all text-sm font-medium text-amber-800 underline decoration-amber-300 underline-offset-4 hover:text-amber-950"
            >
              {profile.featured_mix_link}
            </a>
          </section>
        ) : null}

        {profile.gear_setup ? (
          <section className="space-y-2">
            <SectionHeader title="Gear" />
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {profile.gear_setup}
            </p>
          </section>
        ) : null}

        {profile.booking_contact ? (
          <section className="space-y-2">
            <SectionHeader title="Booking" />
            <p className="text-sm text-zinc-700">{profile.booking_contact}</p>
          </section>
        ) : null}

        {links.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader title="Links" />
            <ul className="space-y-2">
              {links.map((link, i) => (
                <li key={`${link.url}-${i}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-amber-800 underline decoration-amber-300 underline-offset-4 hover:text-amber-950"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="border-t border-zinc-200 pt-8">
          <ProfileBackLink href={ROUTES.root} label="Back" />
        </div>
      </div>
    </div>
  );
}
