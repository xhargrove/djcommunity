import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileMediaSection } from "@/components/profile/profile-media";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getGenreIdsForProfile,
  getProfileByUserId,
} from "@/lib/profile/queries";
import { loadProfileTaxonomy } from "@/lib/taxonomy/queries";
import { ROUTES } from "@/lib/routes";

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `${ROUTES.login}?next=${encodeURIComponent(ROUTES.profileEdit)}`,
    );
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const [taxonomy, initialGenreIds] = await Promise.all([
    loadProfileTaxonomy(),
    getGenreIdsForProfile(profile.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <AppPageHeader
        eyebrow="Identity"
        title="Edit profile"
        subtitle="Tune your creator identity: city, genres, DJ type, links, and media."
      />
      <aside className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700 ring-1 ring-zinc-100">
        <span className="font-medium text-zinc-900">Future: creator tools</span>
        <span className="mx-1.5 text-zinc-400">·</span>
        <Link
          href={ROUTES.creator}
          className="font-medium text-amber-800 underline-offset-2 hover:underline"
        >
          View product roadmap
        </Link>
        <span className="mt-1 block text-xs text-zinc-500">
          No paid features yet—just where MixerHQ is headed for DJs and crews.
        </span>
        <span className="mt-3 block border-t border-zinc-200 pt-3 text-xs text-zinc-600">
          <Link
            href={ROUTES.settingsData}
            className="font-medium text-amber-800 underline-offset-2 hover:underline"
          >
            Account data &amp; deletion requests
          </Link>
          <span className="text-zinc-500"> — honest beta workflow, not instant erasure.</span>
        </span>
      </aside>
      <ProfileMediaSection
        avatarUrl={profile.avatar_url}
        bannerUrl={profile.banner_url}
      />
      <ProfileForm
        mode="edit"
        initial={profile}
        initialGenreIds={initialGenreIds}
        taxonomy={taxonomy}
      />
    </div>
  );
}
