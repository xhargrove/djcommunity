import Link from "next/link";

import { SiteRoleTeamForm } from "@/components/admin/site-role-team-form";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { requireSiteOwnerPage } from "@/lib/auth/require-site-staff";
import { ROUTES } from "@/lib/routes";

export default async function AdminTeamPage() {
  await requireSiteOwnerPage();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={ROUTES.admin}
          className="text-xs text-zinc-600 hover:text-zinc-900"
        >
          ← Admin
        </Link>
        <AppPageHeader
          eyebrow="Platform"
          title="Team & roles"
          subtitle="Owners can promote admins or additional owners. Requires SUPABASE_SERVICE_ROLE_KEY on the server."
        />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 ring-1 ring-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900">Set site role by handle</h2>
        <p className="mt-2 text-sm text-zinc-600">
          The first owner must be assigned in the database (see migration comment) or via the
          Supabase SQL editor before this form is usable.
        </p>
        <div className="mt-6">
          <SiteRoleTeamForm />
        </div>
      </section>
    </div>
  );
}
