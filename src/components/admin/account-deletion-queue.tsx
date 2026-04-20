import Link from "next/link";

import { updateAccountDeletionStaffFormAction } from "@/actions/account-deletion";
import { profilePublicPath } from "@/lib/profile/paths";
import type { AccountDeletionQueueRow } from "@/lib/account-deletion/queries";

export function AccountDeletionQueue({ rows }: { rows: AccountDeletionQueueRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No open deletion requests. Completed and cancelled tickets stay in the database for
        audit but are not listed here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
      {rows.map((row) => (
        <li key={row.id} className="space-y-4 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-medium text-zinc-900">{row.display_name}</p>
              <p className="text-xs text-zinc-500">
                @{row.handle} · requested {new Date(row.created_at).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Status: <span className="font-medium text-zinc-700">{row.status}</span>
              </p>
            </div>
            <Link
              href={profilePublicPath(row.handle)}
              className="text-xs font-medium text-amber-800 underline-offset-2 hover:underline"
            >
              Public profile
            </Link>
          </div>
          {row.message ? (
            <blockquote className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              {row.message}
            </blockquote>
          ) : (
            <p className="text-xs text-zinc-400">No message from member.</p>
          )}
          <form action={updateAccountDeletionStaffFormAction} className="space-y-2 border-t border-zinc-100 pt-3">
            <input type="hidden" name="requestId" value={row.id} />
            <label className="block text-xs font-medium text-zinc-700">
              Next status
              <select
                name="status"
                defaultValue={row.status === "pending" ? "processing" : "completed"}
                className="mt-1 block w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                {row.status === "pending" ? (
                  <>
                    <option value="processing">Mark processing (work started)</option>
                    <option value="completed">Mark completed (fulfilled off-app)</option>
                  </>
                ) : (
                  <option value="completed">Mark completed (fulfilled off-app)</option>
                )}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              Internal note (optional)
              <textarea
                name="staff_note"
                rows={2}
                maxLength={2000}
                defaultValue={row.staff_note ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                placeholder="e.g. Auth user removed 2026-04-20 — see runbook"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Save update
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
