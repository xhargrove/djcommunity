"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  cancelAccountDeletionFromFormAction,
  type AccountDeletionActionResult,
} from "@/actions/account-deletion";

export function CancelDeletionRequestForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    cancelAccountDeletionFromFormAction,
    undefined as AccountDeletionActionResult | undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="requestId" value={requestId} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline disabled:opacity-60"
      >
        {pending ? "Withdrawing…" : "Withdraw this request"}
      </button>
      {state?.ok === false ? (
        <span className="ml-2 text-xs text-red-600" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
