import Link from "next/link";

import { ROUTES } from "@/lib/routes";

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
  { value: "dismissed", label: "Dismissed" },
] as const;

const KINDS = [
  { value: "all", label: "All types" },
  { value: "post", label: "Post" },
  { value: "post_comment", label: "Comment" },
  { value: "room", label: "Room" },
  { value: "room_message", label: "Room message" },
  { value: "profile", label: "Profile" },
] as const;

function buildHref(
  status: string,
  kind: string,
): string {
  const p = new URLSearchParams();
  if (status && status !== "all") {
    p.set("status", status);
  }
  if (kind && kind !== "all") {
    p.set("kind", kind);
  }
  const q = p.toString();
  return q ? `${ROUTES.adminModeration}?${q}` : ROUTES.adminModeration;
}

export function ModerationFilters({
  currentStatus,
  currentKind,
}: {
  currentStatus: string;
  currentKind: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Status
        </label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active =
              (s.value === "all" && currentStatus === "all") ||
              s.value === currentStatus;
            return (
              <Link
                key={s.value}
                href={buildHref(
                  s.value === "all" ? "all" : s.value,
                  currentKind,
                )}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-amber-600 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:border-amber-300"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Target type
        </label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {KINDS.map((k) => {
            const active =
              (k.value === "all" && currentKind === "all") ||
              k.value === currentKind;
            return (
              <Link
                key={k.value}
                href={buildHref(
                  currentStatus,
                  k.value === "all" ? "all" : k.value,
                )}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-zinc-800 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                }`}
              >
                {k.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
