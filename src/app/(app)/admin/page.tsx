import Link from "next/link";

import { AppPageHeader } from "@/components/shell/app-page-header";
import { requireSiteStaffPage } from "@/lib/auth/require-site-staff";
import { canModerateContent, isSiteOwner } from "@/lib/auth/site-role";
import { ROUTES } from "@/lib/routes";

export default async function AdminHomePage() {
  const { profile, siteRole } = await requireSiteStaffPage();
  const owner = isSiteOwner(siteRole);
  const modLink = canModerateContent(siteRole);

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Platform"
        title="Admin"
        subtitle={`Signed in as ${profile.display_name} · role: ${siteRole}`}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 ring-1 ring-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900">Overview</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Platform admins and owners can access this area. Owners manage staff roles and
          critical settings; admins get operational access as you add tools here.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={ROUTES.adminAccountDeletion}
            className="inline-flex rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-950 transition hover:bg-red-100"
          >
            Account deletion queue
          </Link>
          {modLink ? (
            <Link
              href={ROUTES.adminModeration}
              className="inline-flex rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              Open moderation queue
            </Link>
          ) : null}
        </div>
        {owner ? (
          <div className="mt-4">
            <Link
              href={ROUTES.adminTeam}
              className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-100"
            >
              Manage team roles
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
