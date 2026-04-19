import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileMediaSection } from "@/components/profile/profile-media";
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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Edit profile
        </h1>
        <p className="mt-2 max-w-prose text-sm text-[var(--muted)]">
          City, genres, and DJ type are stored as structured data for discovery.
        </p>
      </div>
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
