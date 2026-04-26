import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountDeletionRequestForm } from "@/components/settings/account-deletion-request-form";
import { CancelDeletionRequestForm } from "@/components/settings/cancel-deletion-request-form";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { getPendingDeletionRequestForProfile } from "@/lib/account-deletion/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profile/queries";
import { ROUTES } from "@/lib/routes";

function supportMailto(subject: string): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL?.trim();
  if (!raw) return null;
  const q = new URLSearchParams({ subject });
  return `mailto:${raw}?${q.toString()}`;
}

export default async function AccountDataPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `${ROUTES.login}?next=${encodeURIComponent(ROUTES.settingsData)}`,
    );
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    redirect(ROUTES.onboarding);
  }

  const pendingRequest = await getPendingDeletionRequestForProfile(profile.id);
  const deletionHref = supportMailto("Account deletion request — MixerHQ");
  const exportHref = supportMailto("Data access / export question — MixerHQ");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <AppPageHeader
        eyebrow="Account"
        title="Your data"
        subtitle="What we can do today — one path is real (deletion requests are stored server-side)."
      />

      <div
        className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
        role="note"
      >
        <p className="font-medium">Beta / pre-launch notice</p>
        <p className="mt-1 text-amber-900/90">
          Submitting a deletion request creates an auditable ticket for staff. It does{" "}
          <strong>not</strong> instantly remove your account — fulfillment is manual per
          docs/ACCOUNT_DATA_CONTROLS.md.
        </p>
      </div>

      <section className="space-y-4 text-sm leading-relaxed text-zinc-700">
        <h2 className="text-base font-semibold text-zinc-900">Account deletion request</h2>
        {pendingRequest ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="font-medium text-zinc-900">Open request pending staff review</p>
            <p className="mt-1 text-xs text-zinc-600">
              Submitted {new Date(pendingRequest.created_at).toLocaleString()}
            </p>
            <div className="mt-3">
              <CancelDeletionRequestForm requestId={pendingRequest.id} />
            </div>
          </div>
        ) : (
          <>
            <p>
              Use the form below to record a deletion request in our system. Platform admins
              process tickets in order; you can withdraw a pending request anytime.
            </p>
            <AccountDeletionRequestForm />
          </>
        )}
        <p className="text-xs text-zinc-500">
          Prefer email?{" "}
          {deletionHref ? (
            <a
              href={deletionHref}
              className="font-medium text-amber-800 underline-offset-2 hover:underline"
            >
              Contact support
            </a>
          ) : (
            <span>
              Set <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL</code>{" "}
              for a visible address.
            </span>
          )}
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-zinc-700">
        <h2 className="text-base font-semibold text-zinc-900">Export / portability</h2>
        <p>
          There is no one-click data export yet. If you need a copy of what we hold, email the
          team; scope and turnaround depend on engineering capacity.
        </p>
        {exportHref ? (
          <p>
            <a
              href={exportHref}
              className="font-medium text-amber-800 underline-offset-2 hover:underline"
            >
              Ask about data access
            </a>
          </p>
        ) : null}
      </section>

      <section className="space-y-2 text-xs leading-relaxed text-zinc-500">
        <h2 className="text-sm font-semibold text-zinc-700">Operator documentation</h2>
        <p>
          Fulfillment order (Auth → relational data → storage) and RLS context:{" "}
          <code className="rounded bg-zinc-100 px-1">docs/ACCOUNT_DATA_CONTROLS.md</code>
        </p>
      </section>

      <p className="text-center text-sm">
        <Link
          href={ROUTES.profileEdit}
          className="font-medium text-amber-800 underline-offset-2 hover:underline"
        >
          Back to profile settings
        </Link>
      </p>
    </div>
  );
}
