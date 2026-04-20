"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitContentReportAction } from "@/actions/trust";
import { PRODUCT_EVENTS } from "@/lib/analytics/events";
import { trackProductEvent } from "@/lib/analytics/track-client";
import type { ReportTargetKind } from "@/lib/trust/kinds";

export function InlineReportControl({
  targetKind,
  targetId,
  label = "Report",
  className = "",
}: {
  targetKind: ReportTargetKind;
  targetId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className={className}>
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="text-[10px] font-medium text-zinc-500 hover:text-amber-800"
        >
          {label}
        </button>
      ) : (
        <form
          className="mt-1 space-y-2 rounded-lg border border-zinc-200 bg-white p-2 text-left shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const r = await submitContentReportAction({
                target_kind: targetKind,
                target_id: targetId,
                note: note.trim() || undefined,
              });
              if (!r.ok) {
                setError(r.error);
                return;
              }
              trackProductEvent(PRODUCT_EVENTS.REPORT_SUBMITTED, {
                target_kind: targetKind,
                target_id: targetId,
              });
              setNote("");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <p className="text-[10px] text-zinc-600">
            Reports are reviewed by the platform. Add optional context (max 2000 chars).
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="What should we know?"
            className="w-full rounded-md border border-zinc-200 px-2 py-1 text-[11px] text-zinc-900 placeholder:text-zinc-400"
          />
          {error ? (
            <p className="text-[10px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-amber-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {pending ? "…" : "Submit report"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
