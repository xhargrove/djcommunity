import Link from "next/link";

import { AccountDeletionQueue } from "@/components/admin/account-deletion-queue";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { requireSiteStaffPage } from "@/lib/auth/require-site-staff";
import { listAccountDeletionQueue } from "@/lib/account-deletion/queries";
import { ROUTES } from "@/lib/routes";

export default async function AdminAccountDeletionPage() {
  await requireSiteStaffPage();
  const rows = await listAccountDeletionQueue();

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Platform"
        title="Account deletion queue"
        subtitle="Manual fulfillment — update status after you complete Auth, database, and storage steps documented in ACCOUNT_DATA_CONTROLS.md."
      />

      <div
        className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
        role="note"
      >
        <p className="font-medium">Not automated erasure</p>
        <p className="mt-1 text-amber-900/90">
          This queue records member requests. Completing a ticket requires operator access to
          Supabase (Auth admin, SQL/storage). Mark <strong>completed</strong> only after the
          runbook is done.
        </p>
      </div>

      <AccountDeletionQueue rows={rows} />

      <p className="text-center text-sm">
        <Link
          href={ROUTES.admin}
          className="font-medium text-amber-800 underline-offset-2 hover:underline"
        >
          Back to admin
        </Link>
      </p>
    </div>
  );
}
