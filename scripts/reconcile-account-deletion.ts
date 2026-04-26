/**
 * Operator-only reconciliation after a partial deletion run (e.g. finalize failed but Auth user
 * is already gone). Service role only — never expose via HTTP.
 *
 * Honesty rules:
 * - Marks completed + execution succeeded ONLY after verifying the Auth user is absent (or ticket
 *   already has null user_id/profile_id with no surviving profile row).
 * - Refuses if Auth user or profile row still exists (deletion not actually complete).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/reconcile-account-deletion.ts --request-id=<uuid> --dry-run
 *   npx tsx --env-file=.env.local scripts/reconcile-account-deletion.ts --request-id=<uuid> --confirm=RECONCILE:<same-uuid>
 *
 * @see docs/ACCOUNT_DATA_CONTROLS.md
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";

type JsonLog = {
  level: "info" | "error" | "warn";
  source: "djcn";
  category: "account_deletion";
  context: string;
  detail: string;
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

type Ticket = Pick<
  Database["public"]["Tables"]["account_deletion_requests"]["Row"],
  | "id"
  | "user_id"
  | "profile_id"
  | "status"
  | "execution_status"
  | "last_error_code"
  | "staff_note"
>;

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const requestId = getArg("request-id");
  const confirm = getArg("confirm");
  const dryRun = hasFlag("dry-run");

  if (!url || !serviceKey) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "reconcile-account-deletion",
      code: "MISSING_ENV",
      detail: "missing_NEXT_PUBLIC_SUPABASE_URL_or_SUPABASE_SERVICE_ROLE_KEY",
    });
    process.exit(1);
  }

  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "reconcile-account-deletion",
      code: "INVALID_REQUEST_ID",
      detail: "invalid_or_missing_request_id",
    });
    process.exit(1);
  }

  const expected = `RECONCILE:${requestId}`;
  if (!dryRun && confirm !== expected) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "reconcile-account-deletion",
      code: "CONFIRM_REQUIRED",
      detail: `pass_${expected}`,
    });
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ticket, error: loadErr } = await supabase
    .from("account_deletion_requests")
    .select(
      "id, user_id, profile_id, status, execution_status, last_error_code, staff_note",
    )
    .eq("id", requestId)
    .single();

  if (loadErr || !ticket) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "reconcile-account-deletion",
      code: "LOAD_FAILED",
      detail: loadErr?.message ?? "not_found",
    });
    process.exit(1);
  }

  const t = ticket as Ticket;

  if (t.status === "cancelled") {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "reconcile-account-deletion",
      detail: "ticket_cancelled",
    });
    process.exit(1);
  }

  if (t.execution_status === "succeeded" && t.status === "completed") {
    log({
      level: "info",
      source: "djcn",
      category: "account_deletion",
      context: "reconcile-account-deletion",
      detail: "already_succeeded_noop",
    });
    process.exit(0);
  }

  if (!["failed", "running"].includes(t.execution_status)) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "reconcile-account-deletion",
      code: "NOT_RECONCILABLE_STATE",
      detail: `execution_status=${t.execution_status}_expected_failed_or_running`,
    });
    process.exit(1);
  }

  if (t.user_id) {
    const u = await supabase.auth.admin.getUserById(t.user_id);
    if (u.data?.user) {
      log({
        level: "error",
        source: "djcn",
        category: "account_deletion",
        context: "reconcile-account-deletion",
        code: "AUTH_USER_STILL_PRESENT",
        detail: "refuse_fake_completion_delete_user_first_or_run_execute_script",
      });
      process.exit(1);
    }
    if (u.error) {
      const em = u.error.message?.toLowerCase() ?? "";
      const notFoundish =
        em.includes("not found") ||
        em.includes("user not found") ||
        em.includes("no user");
      if (!notFoundish) {
        log({
          level: "error",
          source: "djcn",
          category: "account_deletion",
          context: "reconcile-account-deletion",
          code: "AUTH_LOOKUP_AMBIGUOUS",
          detail: "retry_when_auth_api_reliable",
        });
        process.exit(1);
      }
    }
  }

  if (t.profile_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", t.profile_id)
      .maybeSingle();
    if (prof) {
      log({
        level: "error",
        source: "djcn",
        category: "account_deletion",
        context: "reconcile-account-deletion",
        code: "PROFILE_STILL_PRESENT",
        detail: "refuse_fake_completion_profile_row_exists",
      });
      process.exit(1);
    }
  }

  log({
    level: "info",
    source: "djcn",
    category: "account_deletion",
    context: "reconcile-account-deletion",
    detail: `checks_ok dry_run=${dryRun}`,
  });

  if (dryRun) {
    log({
      level: "info",
      source: "djcn",
      category: "account_deletion",
      context: "reconcile-account-deletion",
      detail: "dry_run_would_complete_ticket",
    });
    return;
  }

  const nowIso = new Date().toISOString();
  const prior = t.staff_note?.trim();
  const line = `[reconciled ${nowIso} — ticket closed after verify account data gone]`;
  const mergedNote = prior ? `${prior}\n${line}` : line;

  const { data: updated, error: upErr } = await supabase
    .from("account_deletion_requests")
    .update({
      status: "completed",
      execution_status: "succeeded",
      executed_at: nowIso,
      reviewed_at: nowIso,
      last_error_code: null,
      last_error_at: null,
      last_execution_stage: "reconcile",
      staff_note: mergedNote,
    })
    .eq("id", requestId)
    .in("execution_status", ["failed", "running"])
    .select("id");

  if (upErr || !updated?.length) {
    log({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "reconcile-account-deletion",
      code: "UPDATE_FAILED",
      detail: upErr?.message ?? "no_row_updated",
    });
    process.exit(1);
  }

  log({
    level: "info",
    source: "djcn",
    category: "account_deletion",
    context: "reconcile-account-deletion",
    detail: `reconciled_ok request_id=${requestId}`,
  });
}

main().catch((e) => {
  log({
    level: "error",
    source: "djcn",
    category: "account_deletion",
    context: "reconcile-account-deletion",
    detail: `fatal:${e instanceof Error ? e.message : String(e)}`,
  });
  process.exit(1);
});
