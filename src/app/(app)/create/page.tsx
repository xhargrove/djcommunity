import Link from "next/link";
import { redirect } from "next/navigation";

import { CreatePostForm } from "@/components/feed/create-post-form";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

export default async function CreatePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <AppPageHeader
        eyebrow="Share"
        title="Create"
        subtitle="Clips, flyers, photos, or text—one flow, straight to the feed."
      />
      <CreatePostForm />
      <p className="text-center text-xs text-zinc-600">
        <Link href={ROUTES.home} className="text-zinc-600 hover:text-zinc-900">
          Back to home
        </Link>
      </p>
    </div>
  );
}
