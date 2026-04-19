import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EditPostForm } from "@/components/posts/edit-post-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getPostById } from "@/lib/posts/queries";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `${ROUTES.login}?next=${encodeURIComponent(ROUTES.postEdit(id))}`,
    );
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const post = await getPostById(id);
  if (!post || post.profile_id !== profile.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={ROUTES.home}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Back to feed
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Edit post
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Only caption and post type can be changed. To replace media, delete this post and create a
          new one.
        </p>
      </div>
      <EditPostForm post={post} />
    </div>
  );
}
