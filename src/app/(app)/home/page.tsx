import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedList } from "@/components/feed/feed-list";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { listFeedPosts } from "@/lib/posts/queries";
import { profilePublicPath } from "@/lib/profile/paths";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const feedItems = await listFeedPosts(50, profile.id);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-10">
      <AppPageHeader
        eyebrow="Feed"
        title="Home"
        subtitle="Scene-first feed from people you follow and the network—newest up top. Post to Home, drop into Rooms for real-time chat, Explore to discover."
        action={
          <Link
            href={ROUTES.create}
            className="inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-900/15 transition hover:bg-amber-700"
          >
            Create
          </Link>
        }
      />

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            For you · @{profile.handle}
          </p>
          <Link
            href={profilePublicPath(profile.handle)}
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
          >
            Profile
          </Link>
        </div>
        <FeedList items={feedItems} currentProfileId={profile.id} />
      </section>
    </div>
  );
}
