import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profile/queries";
import { loadProfileTaxonomy } from "@/lib/taxonomy/queries";
import { ROUTES } from "@/lib/routes";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `${ROUTES.login}?next=${encodeURIComponent(ROUTES.onboarding)}`,
    );
  }

  const profile = await getProfileByUserId(user.id);
  if (profile) {
    redirect(ROUTES.home);
  }

  const taxonomy = await loadProfileTaxonomy();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Create your DJ profile
        </h1>
        <p className="mt-2 max-w-prose text-sm text-[var(--muted)]">
          Choose your city, genres, and DJ type from the lists below. You can add
          photos after saving from Edit profile.
        </p>
      </div>
      <ProfileForm
        mode="create"
        initial={null}
        initialGenreIds={[]}
        taxonomy={taxonomy}
      />
    </div>
  );
}
