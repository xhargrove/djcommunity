"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateContentReportStatusAction } from "@/actions/moderation";
import type { ContentReportRow, ContentReportTriageRow } from "@/types/database";

export function ModerationReportActions({
  report,
  triage,
}: {
  report: ContentReportRow;
  triage: ContentReportTriageRow | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(report.status);
  const [staffNote, setStaffNote] = useState(triage?.staff_note ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    setPending(true);
    try {
      const r = await updateContentReportStatusAction({
        reportId: report.id,
        status: status as "open" | "reviewed" | "dismissed",
        staff_note: staffNote.trim() || undefined,
      });
      if (r.ok) {
        setMessage("Saved.");
        router.refresh();
      } else {
        setMessage(r.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
        Triage
      </h3>
      <p className="text-[10px] text-zinc-500">
        Staff notes are stored separately from the report row and are not visible to reporters.
      </p>
      <div>
        <label htmlFor="mod-status" className="block text-xs font-medium text-zinc-700">
          Status
        </label>
        <select
          id="mod-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
        >
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>
      <div>
        <label htmlFor="mod-note" className="block text-xs font-medium text-zinc-700">
          Staff note (internal)
        </label>
        <textarea
          id="mod-note"
          value={staffNote}
          onChange={(e) => setStaffNote(e.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          placeholder="Optional context for other moderators…"
        />
      </div>
      <button
        type="button"
        onClick={() => void save()}
        disabled={pending}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      {message ? (
        <p
          className={`text-sm ${message === "Saved." ? "text-emerald-700" : "text-red-700"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
