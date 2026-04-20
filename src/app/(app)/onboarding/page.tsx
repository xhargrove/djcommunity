import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { AppPageHeader } from "@/components/shell/app-page-header";
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <AppPageHeader
        eyebrow="Onboarding"
        title="Create your DJ profile"
        subtitle="You’re building your public DJ identity: where you play, what you spin, and how people find you. Avatar and banner come next in Edit profile."
      />
      <ProfileForm
        mode="create"
        initial={null}
        initialGenreIds={[]}
        taxonomy={taxonomy}
      />
    </div>
  );
}
