"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  submitAccountDeletionRequestAction,
  type AccountDeletionActionResult,
} from "@/actions/account-deletion";

export function AccountDeletionRequestForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    submitAccountDeletionRequestAction,
    undefined as AccountDeletionActionResult | undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-3">
      <label className="block text-xs font-medium text-zinc-700">
        Optional note to staff (max 2000 characters)
        <textarea
          name="message"
          rows={4}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-300 placeholder:text-zinc-400 focus:ring-2"
          placeholder="e.g. reason for leaving, data concerns — no PII required"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-900 transition hover:bg-red-100 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit account deletion request"}
      </button>
      {state?.ok === false ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-sm font-medium text-emerald-800" role="status">
          Request recorded. Platform staff will process it manually — this does not instantly
          delete your account.
        </p>
      ) : null}
    </form>
  );
}
