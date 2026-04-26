import Link from "next/link";
import { redirect } from "next/navigation";

import { MashupMixtapeForm } from "@/components/mashups-mixtapes/mashup-mixtape-form";
import { MashupMixtapeList } from "@/components/mashups-mixtapes/mashup-mixtape-list";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { listMashupMixtapePosts } from "@/lib/mashups-mixtapes/queries";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

export default async function MashupsMixtapesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const items = await listMashupMixtapePosts(profile.id, 80);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-10">
      <AppPageHeader
        eyebrow="Library"
        title="Mashups & Mixtapes"
        subtitle="Share downloadable or streaming links to your mixes and mashups. Links must use https:// — files stay on your host (SoundCloud, Dropbox, Google Drive, etc.)."
        action={
          <Link
            href={ROUTES.home}
            className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            Home
          </Link>
        }
      />

      <MashupMixtapeForm />
      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Community links
        </h2>
        <MashupMixtapeList items={items} />
      </section>
    </div>
  );
}
