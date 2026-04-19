import Link from "next/link";
import { redirect } from "next/navigation";

import { CreatePostForm } from "@/components/feed/create-post-form";
import { FeedList } from "@/components/feed/feed-list";
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
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Feed
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-[var(--muted)]">
          Signed in as{" "}
          <span className="text-zinc-300">{profile.display_name}</span> (@
          {profile.handle}). Posts from all DJs appear below, newest first.
        </p>
      </div>

      <CreatePostForm />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Latest
        </h2>
        <FeedList items={feedItems} currentProfileId={profile.id} />
      </section>

      <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-8">
        <Link
          href={profilePublicPath(profile.handle)}
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
        >
          View public profile
        </Link>
        <Link
          href={ROUTES.profileEdit}
          className="rounded-md border border-[var(--border)] bg-zinc-900 px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-zinc-800"
        >
          Edit profile
        </Link>
      </div>
    </div>
  );
}
