import Link from "next/link";

import { ModerationFilters } from "@/components/moderation/moderation-filters";
import { AppPageHeader } from "@/components/shell/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireCanModeratePage } from "@/lib/auth/require-moderation";
import {
  listContentReportsForModeration,
  type ModerationListFilters,
} from "@/lib/moderation/queries";
import { ROUTES } from "@/lib/routes";

const STATUS_VALUES = ["open", "reviewed", "dismissed"] as const;
const KIND_VALUES = [
  "post",
  "post_comment",
  "room",
  "room_message",
  "profile",
] as const;

function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): ModerationListFilters {
  const rawStatus = sp.status;
  const statusList = STATUS_VALUES as readonly string[];
  const status =
    typeof rawStatus === "string" && statusList.includes(rawStatus)
      ? (rawStatus as (typeof STATUS_VALUES)[number])
      : "all";

  const rawKind = sp.kind;
  const kindList = KIND_VALUES as readonly string[];
  const targetKind =
    typeof rawKind === "string" && kindList.includes(rawKind) ? rawKind : "all";

  return {
    status,
    targetKind,
  };
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-950 ring-amber-200";
    case "reviewed":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    case "dismissed":
      return "bg-zinc-100 text-zinc-700 ring-zinc-200";
    default:
      return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  }
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ModerationQueuePage({ searchParams }: PageProps) {
  await requireCanModeratePage();
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const items = await listContentReportsForModeration(filters);

  const currentStatus =
    filters.status && filters.status !== "all" ? filters.status : "all";
  const currentKind =
    filters.targetKind && filters.targetKind !== "all"
      ? filters.targetKind
      : "all";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={ROUTES.home}
          className="text-xs text-zinc-600 hover:text-zinc-900"
        >
          ← Home
        </Link>
        <AppPageHeader
          eyebrow="Trust & safety"
          title="Moderation queue"
          subtitle="Review user reports. Access is enforced server-side and in the database (RLS)."
        />
      </div>

      <ModerationFilters
        currentStatus={currentStatus}
        currentKind={currentKind}
      />

      {items.length === 0 ? (
        <EmptyState
          title="No reports match"
          description="Try another filter, or check back when new reports arrive."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-100">
          <ul className="divide-y divide-zinc-100">
            {items.map((row) => (
              <li key={row.id}>
                <Link
                  href={ROUTES.adminModerationReport(row.id)}
                  className="flex flex-col gap-2 px-4 py-4 transition hover:bg-zinc-50 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${statusBadgeClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                        {row.target_kind.replace("_", " ")}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium text-zinc-900">
                      Reporter: @{row.reporter.handle} · {row.reporter.display_name}
                    </p>
                    {row.note ? (
                      <p className="line-clamp-2 text-xs text-zinc-600">
                        {row.note}
                      </p>
                    ) : (
                      <p className="text-xs italic text-zinc-400">No reporter note</p>
                    )}
                  </div>
                  <time
                    className="shrink-0 text-[10px] text-zinc-500 tabular-nums"
                    dateTime={row.created_at}
                  >
                    {new Date(row.created_at).toLocaleString()}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
