/**
 * Operator-only account deletion execution (service role). Never expose via HTTP.
 *
 * Usage (from repo root):
 *   npx tsx --env-file=.env.local scripts/execute-account-deletion.ts --request-id=<uuid> --dry-run
 *   npx tsx --env-file=.env.local scripts/execute-account-deletion.ts --request-id=<uuid> --confirm=DELETE_ACCOUNT:<same-uuid>
 *
 * Retry / recovery:
 *   - Idempotent: if already status=completed & execution_status=succeeded → exits 0.
 *   - Stuck `execution_status=running` (crashed run): pass --ack-stale-run to reset to idle, then re-run.
 *   - Storage: remove failures that look like missing objects are logged and skipped where safe.
 *   - Auth: if user already deleted, finalizes as success.
 *   - Finalize failed after destructive work: `npm run reconcile:account-deletion` (see docs).
 *
 * Claim uses DB RPC `claim_account_deletion_execution` (atomic). On CLAIM_FAILED, retry once or
 * confirm no other operator is running the same ticket.
 *
 * Order: claim → storage → auth delete → finalize (status + execution_status).
 *
 * @see docs/ACCOUNT_DATA_CONTROLS.md
 * @see docs/ACCOUNT_DELETION_CLEANUP.md
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";

/** Machine-readable; log-safe (no PII). */
export const ExecutionErrorCode = {
  MISSING_ENV: "MISSING_ENV",
  INVALID_REQUEST_ID: "INVALID_REQUEST_ID",
  CONFIRM_REQUIRED: "CONFIRM_REQUIRED",
  LOAD_FAILED: "LOAD_FAILED",
  TICKET_CLOSED_MANUAL: "TICKET_CLOSED_MANUAL",
  ALREADY_SUCCEEDED: "ALREADY_SUCCEEDED",
  NO_USER_ID: "NO_USER_ID",
  INVALID_WORKFLOW_STATUS: "INVALID_WORKFLOW_STATUS",
  STALE_RUNNING: "STALE_RUNNING_NEED_ACK",
  CLAIM_FAILED: "CLAIM_FAILED",
  STORAGE_POST_MEDIA: "STORAGE_POST_MEDIA",
  STORAGE_PROFILE_ASSETS: "STORAGE_PROFILE_ASSETS",
  AUTH_DELETE: "AUTH_DELETE",
  FINALIZE: "FINALIZE",
} as const;

type JsonLog = {
  level: "info" | "error" | "warn";
  source: "djcn";
  category: "account_deletion";
  context: string;
  detail: string;
  stage?: string;
  code?: string;
};

function log(line: JsonLog): void {
  console[line.level === "error" ? "error" : line.level === "warn" ? "warn" : "info"](
    JSON.stringify(line),
  );
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const raw = process.argv.find((a) => a.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function benignStorageError(err: { message?: string; statusCode?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  if (m.includes("not found") || m.includes("does not exist") || m.includes("no such")) {
    return true;
  }
  if (err.statusCode === "404") {
    return true;
  }
  return false;
}

function authDeleteAlreadyGone(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not found") ||
    m.includes("user not found") ||
    m.includes("no user found") ||
    m.includes("does not exist")
  );
}

type Ticket = Pick<
  Database["public"]["Tables"]["account_deletion_requests"]["Row"],
  | "id"
  | "user_id"
  | "profile_id"
  | "status"
  | "execution_status"
  | "execution_attempts"
  | "profile_handle_snapshot"
>;

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const requestId = getArg("request-id");
  const confirm = getArg("confirm");
  const dryRun = hasFlag("dry-run");
  const ackStaleRun = hasFlag("ack-stale-run");

  if (!url || !serviceKey) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.MISSING_ENV,
      detail: "missing_NEXT_PUBLIC_SUPABASE_URL_or_SUPABASE_SERVICE_ROLE_KEY",
    });
    process.exit(1);
  }

  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.INVALID_REQUEST_ID,
      detail: "invalid_or_missing_request_id",
    });
    process.exit(1);
  }

  const expectedConfirm = `DELETE_ACCOUNT:${requestId}`;
  if (!dryRun && confirm !== expectedConfirm) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.CONFIRM_REQUIRED,
      detail: `pass_${expectedConfirm}`,
    });
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ticket, error: loadErr } = await supabase
    .from("account_deletion_requests")
    .select(
      "id, user_id, profile_id, status, execution_status, execution_attempts, profile_handle_snapshot",
    )
    .eq("id", requestId)
    .single();

  if (loadErr || !ticket) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.LOAD_FAILED,
      detail: loadErr?.message ?? "not_found",
    });
    process.exit(1);
  }

  const t = ticket as Ticket;

  if (t.status === "cancelled") {
    log({
      level: "warn",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      detail: "ticket_cancelled_noop",
    });
    process.exit(1);
  }

  if (t.status === "completed") {
    if (t.execution_status === "succeeded") {
      log({
        level: "info",
        source: "djcn",
        category: "account_deletion",
        context: "execute-account-deletion",
        code: ExecutionErrorCode.ALREADY_SUCCEEDED,
        detail: `idempotent_ok request_id=${requestId}`,
      });
      process.exit(0);
    }
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.TICKET_CLOSED_MANUAL,
      detail:
        "status_completed_execution_not_succeeded_refuse_automated_run_use_manual_notes",
    });
    process.exit(1);
  }

  if (!t.user_id) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.NO_USER_ID,
      detail: "request_has_no_user_id",
    });
    process.exit(1);
  }

  if (!["pending", "processing"].includes(t.status)) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.INVALID_WORKFLOW_STATUS,
      detail: `status=${t.status}`,
    });
    process.exit(1);
  }

  if (t.execution_status === "succeeded") {
    log({
      level: "info",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      detail: `idempotent_ok execution_already_succeeded request_id=${requestId}`,
    });
    process.exit(0);
  }

  if (t.execution_status === "running") {
    if (!ackStaleRun) {
      log({
        level: "error",
        source: "djcn",
        category: "account_deletion",
        context: "execute-account-deletion",
        code: ExecutionErrorCode.STALE_RUNNING,
        detail: "pass_ack_stale_run_to_reset_after_crash",
      });
      process.exit(1);
    }
    const nowIso = new Date().toISOString();
    await supabase
      .from("account_deletion_requests")
      .update({
        execution_status: "idle",
        last_error_code: "STALE_RUN_ACK",
        last_error_at: nowIso,
        last_execution_stage: "stale_ack",
      })
      .eq("id", requestId)
      .eq("execution_status", "running");
    log({
      level: "warn",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      detail: "stale_run_reset_to_idle",
    });
    t.execution_status = "idle";
  }

  if (!["idle", "failed"].includes(t.execution_status)) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      detail: `execution_status=${t.execution_status}_not_runnable`,
    });
    process.exit(1);
  }

  const userId = t.user_id;
  const profileId = t.profile_id;

  log({
    level: "info",
    source: "djcn",
    category: "account_deletion",
    context: "execute-account-deletion",
    detail: `plan request_id=${requestId} user_id=${userId} profile_id=${profileId ?? "null"} dry_run=${dryRun} execution_status=${t.execution_status} attempts=${t.execution_attempts}`,
  });

  if (dryRun) {
    let postCount = 0;
    let mediaPaths = 0;
    let sample = "";
    if (profileId) {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId);
      postCount = count ?? 0;
      const { data: postRows } = await supabase
        .from("posts")
        .select("id")
        .eq("profile_id", profileId);
      const ids = postRows?.map((p) => p.id) ?? [];
      if (ids.length > 0) {
        const { data: pm } = await supabase
          .from("post_media")
          .select("storage_path")
          .in("post_id", ids);
        mediaPaths = pm?.length ?? 0;
        sample = (pm ?? []).slice(0, 5).map((m) => m.storage_path).join(",");
      }
    }
    log({
      level: "info",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      stage: "dry_run",
      detail: `posts=${postCount} post_media_objects=${mediaPaths} sample_paths=${sample}`,
    });
    log({
      level: "info",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      detail: "dry_run_complete_no_changes",
    });
    return;
  }

  const { data: claimRaw, error: claimErr } = await supabase.rpc(
    "claim_account_deletion_execution",
    { p_request_id: requestId },
  );

  const claimResult = claimRaw as { claimed?: boolean; attempts?: number; reason?: string } | null;

  if (claimErr) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.CLAIM_FAILED,
      stage: "claim",
      detail: claimErr.message,
    });
    process.exit(1);
  }

  if (!claimResult?.claimed) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.CLAIM_FAILED,
      stage: "claim",
      detail: `no_atomic_claim reason=${claimResult?.reason ?? "unknown"} — retry_or_check_concurrent_operator`,
    });
    process.exit(1);
  }

  const nextAttempt = claimResult.attempts ?? t.execution_attempts + 1;

  const recordFailure = async (code: string, stage: string) => {
    const ts = new Date().toISOString();
    await supabase
      .from("account_deletion_requests")
      .update({
        execution_status: "failed",
        last_error_code: code,
        last_error_at: ts,
        last_execution_stage: stage,
      })
      .eq("id", requestId)
      .eq("execution_status", "running");
  };

  const paths: string[] = [];
  if (profileId) {
    await supabase
      .from("account_deletion_requests")
      .update({ last_execution_stage: "storage_post_media_list" })
      .eq("id", requestId)
      .eq("execution_status", "running");

    const { data: posts } = await supabase
      .from("posts")
      .select("id")
      .eq("profile_id", profileId);
    const postIds = posts?.map((p) => p.id) ?? [];
    if (postIds.length > 0) {
      const { data: pm } = await supabase
        .from("post_media")
        .select("storage_path")
        .in("post_id", postIds);
      for (const m of pm ?? []) {
        paths.push(m.storage_path);
      }
    }
  }

  if (paths.length > 0) {
    const { error: rmErr } = await supabase.storage.from("post_media").remove(paths);
    if (rmErr && !benignStorageError(rmErr)) {
      log({
        level: "error",
        source: "djcn",
        category: "account_deletion",
        context: "execute-account-deletion",
        code: ExecutionErrorCode.STORAGE_POST_MEDIA,
        stage: "storage_post_media",
        detail: rmErr.message,
      });
      await recordFailure(ExecutionErrorCode.STORAGE_POST_MEDIA, "storage_post_media");
      process.exit(1);
    }
    if (rmErr && benignStorageError(rmErr)) {
      log({
        level: "warn",
        source: "djcn",
        category: "account_deletion",
        context: "execute-account-deletion",
        stage: "storage_post_media",
        detail: `benign_continuing:${rmErr.message}`,
      });
    }
  }

  await supabase
    .from("account_deletion_requests")
    .update({ last_execution_stage: "storage_profile_assets" })
    .eq("id", requestId)
    .eq("execution_status", "running");

  const avatarPath = `${userId}/avatar`;
  const bannerPath = `${userId}/banner`;
  const avRes = await supabase.storage.from("avatars").remove([avatarPath]);
  if (avRes.error && !benignStorageError(avRes.error)) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      code: ExecutionErrorCode.STORAGE_PROFILE_ASSETS,
      stage: "storage_avatars",
      context: "execute-account-deletion",
      detail: avRes.error.message,
    });
    await recordFailure(ExecutionErrorCode.STORAGE_PROFILE_ASSETS, "storage_avatars");
    process.exit(1);
  }
  const banRes = await supabase.storage.from("banners").remove([bannerPath]);
  if (banRes.error && !benignStorageError(banRes.error)) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      code: ExecutionErrorCode.STORAGE_PROFILE_ASSETS,
      stage: "storage_banners",
      context: "execute-account-deletion",
      detail: banRes.error.message,
    });
    await recordFailure(ExecutionErrorCode.STORAGE_PROFILE_ASSETS, "storage_banners");
    process.exit(1);
  }

  await supabase
    .from("account_deletion_requests")
    .update({
      last_execution_stage: "auth_delete",
      status: "processing",
    })
    .eq("id", requestId)
    .eq("execution_status", "running");

  const { error: delAuthErr } = await supabase.auth.admin.deleteUser(userId);
  let authGone = false;
  if (delAuthErr) {
    if (authDeleteAlreadyGone(delAuthErr.message)) {
      authGone = true;
      log({
        level: "warn",
        source: "djcn",
        category: "account_deletion",
        context: "execute-account-deletion",
        stage: "auth_delete",
        detail: "auth_user_already_absent_continuing",
      });
    } else {
      log({
        level: "error",
        source: "djcn",
        category: "account_deletion",
        context: "execute-account-deletion",
        code: ExecutionErrorCode.AUTH_DELETE,
        stage: "auth_delete",
        detail: delAuthErr.message,
      });
      await recordFailure(ExecutionErrorCode.AUTH_DELETE, "auth_delete");
      process.exit(1);
    }
  }

  if (!authGone && !delAuthErr) {
    log({
      level: "info",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      stage: "auth_delete",
      detail: "auth_user_deleted",
    });
  }

  const nowIso = new Date().toISOString();
  const { data: prior } = await supabase
    .from("account_deletion_requests")
    .select("staff_note")
    .eq("id", requestId)
    .single();

  const mergedNote = prior?.staff_note?.trim()
    ? `${prior.staff_note}\n[script completed ${nowIso}]`
    : `[script completed ${nowIso}]`;

  await supabase
    .from("account_deletion_requests")
    .update({ last_execution_stage: "finalize" })
    .eq("id", requestId)
    .eq("execution_status", "running");

  const { data: finalized, error: completeErr } = await supabase
    .from("account_deletion_requests")
    .update({
      status: "completed",
      execution_status: "succeeded",
      executed_at: nowIso,
      reviewed_at: nowIso,
      last_error_code: null,
      last_error_at: null,
      last_execution_stage: "finalize",
      staff_note: mergedNote,
    })
    .eq("id", requestId)
    .eq("execution_status", "running")
    .select("id");

  if (completeErr || !finalized?.length) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "execute-account-deletion",
      code: ExecutionErrorCode.FINALIZE,
      stage: "finalize",
      detail: completeErr?.message ?? "no_row_updated_idempotent_check",
    });
    await recordFailure(ExecutionErrorCode.FINALIZE, "finalize");
    process.exit(1);
  }

  log({
    level: "info",
    source: "djcn",
    category: "account_deletion",
    context: "execute-account-deletion",
    stage: "done",
    detail: `completed request_id=${requestId} attempts=${String(nextAttempt)}`,
  });
}

main().catch((e) => {
  log({
    level: "error",
    source: "djcn",
    category: "account_deletion",
    context: "execute-account-deletion",
    detail: `fatal:${e instanceof Error ? e.message : String(e)}`,
  });
  process.exit(1);
});
