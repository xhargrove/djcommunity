import type { AccountDeletionRequestRow } from "@/types/database";

/** Finalize failed after destructive work may have completed — operator reconcile script is the repair path. */
export function finalizeFailureNeedsReconcileHint(
  row: Pick<AccountDeletionRequestRow, "execution_status" | "last_error_code">,
): boolean {
  return (
    row.execution_status === "failed" && row.last_error_code === "FINALIZE"
  );
}

/** Long-running execution without progress — ops should confirm process or use --ack-stale-run on the execute script. */
export function executionMayBeStuck(
  row: Pick<
    AccountDeletionRequestRow,
    "execution_status" | "updated_at" | "created_at"
  >,
  staleAfterMinutes = 45,
): boolean {
  if (row.execution_status !== "running") {
    return false;
  }
  const t = new Date(row.updated_at || row.created_at).getTime();
  return Date.now() - t > staleAfterMinutes * 60 * 1000;
}
