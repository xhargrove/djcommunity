import Link from "next/link";
import { notFound } from "next/navigation";

import { ModerationReportActions } from "@/components/moderation/moderation-report-actions";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { requireCanModeratePage } from "@/lib/auth/require-moderation";
import { getReportTargetContext } from "@/lib/moderation/target-context";
import {
  getContentReportByIdForModeration,
  getProfilesByIds,
} from "@/lib/moderation/queries";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModerationReportDetailPage({ params }: PageProps) {
  await requireCanModeratePage();
  const { id } = await params;
  const bundle = await getContentReportByIdForModeration(id);
  if (!bundle) {
    notFound();
  }

  const { report, triage } = bundle;

  const profileIds = [
    ...new Set(
      [report.reporter_profile_id, triage?.reviewed_by_profile_id].filter(
        (x): x is string => typeof x === "string" && x.length > 0,
      ),
    ),
  ];

  const [targetCtx, profiles] = await Promise.all([
    getReportTargetContext(report),
    getProfilesByIds(profileIds),
  ]);

  const reporter = profiles.get(report.reporter_profile_id);
  const reviewer = triage?.reviewed_by_profile_id
    ? profiles.get(triage.reviewed_by_profile_id)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={ROUTES.adminModeration}
          className="text-xs text-zinc-600 hover:text-zinc-900"
        >
          ← Queue
        </Link>
        <AppPageHeader
          eyebrow="Report"
          title={`${report.target_kind.replace("_", " ")} · ${report.status}`}
          subtitle={`Submitted ${new Date(report.created_at).toLocaleString()}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,min(360px,100%)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 ring-1 ring-zinc-100">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Reporter
            </h2>
            <p className="mt-2 text-sm text-zinc-900">
              {reporter
                ? `@${reporter.handle} · ${reporter.display_name}`
                : "Unknown profile"}
            </p>
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Reporter note
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {report.note ?? "—"}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 ring-1 ring-zinc-100">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Target · {targetCtx.title}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">
              {targetCtx.detail}
            </p>
            {targetCtx.href ? (
              <p className="mt-4">
                <Link
                  href={targetCtx.href}
                  className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline"
                >
                  {targetCtx.externalLabel ?? "Open context"}
                </Link>
              </p>
            ) : null}
            <p className="mt-3 font-mono text-[10px] text-zinc-400">
              target_id: {report.target_id}
            </p>
          </section>

          {triage?.reviewed_at ? (
            <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 ring-1 ring-zinc-100">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Last review
              </h2>
              <p className="mt-2 text-sm text-zinc-700">
                {new Date(triage.reviewed_at).toLocaleString()}
                {reviewer ? ` · @${reviewer.handle}` : ""}
              </p>
              {triage.staff_note ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">
                  {triage.staff_note}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <ModerationReportActions report={report} triage={triage} />
      </div>
    </div>
  );
}
