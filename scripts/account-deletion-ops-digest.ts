/**
 * Read-only digest of `v_account_deletion_open_ops`: counts by ops_severity / ops_category,
 * optional webhook delivery when explicitly configured. Never writes to the database.
 *
 *   npm run digest:account-deletion
 *   npm run digest:account-deletion -- --force-webhook   # POST even if only informational rows
 *
 * @see docs/ACCOUNT_DELETION_OPS_DIGEST.md
 */

import { createClient } from "@supabase/supabase-js";

import type { AccountDeletionOpenOpsRow, Database } from "../src/types/database";

type DigestNotifyMode = "action_or_warning" | "always" | "never";

type WebhookFormat = "json" | "slack";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseNotifyMode(): DigestNotifyMode {
  const v = process.env.ACCOUNT_DELETION_OPS_DIGEST_NOTIFY?.trim().toLowerCase();
  if (v === "always" || v === "never" || v === "action_or_warning") {
    return v;
  }
  return "action_or_warning";
}

function parseWebhookFormat(): WebhookFormat {
  const v = process.env.ACCOUNT_DELETION_OPS_WEBHOOK_FORMAT?.trim().toLowerCase();
  return v === "slack" ? "slack" : "json";
}

function aggregate(rows: AccountDeletionOpenOpsRow[]) {
  const by_severity: Record<string, number> = {};
  const by_category: Record<string, number> = {};
  for (const r of rows) {
    by_severity[r.ops_severity] = (by_severity[r.ops_severity] ?? 0) + 1;
    by_category[r.ops_category] = (by_category[r.ops_category] ?? 0) + 1;
  }
  return { by_severity, by_category, total: rows.length };
}

function shouldDeliverWebhook(
  mode: DigestNotifyMode,
  agg: ReturnType<typeof aggregate>,
  forceWebhook: boolean,
): { deliver: boolean; reason: string } {
  if (mode === "never") {
    return { deliver: false, reason: "ACCOUNT_DELETION_OPS_DIGEST_NOTIFY=never" };
  }
  if (agg.total === 0) {
    return { deliver: false, reason: "no_open_ops_rows" };
  }
  if (forceWebhook || mode === "always") {
    return { deliver: true, reason: forceWebhook ? "force_webhook_flag" : "notify_mode_always" };
  }
  const ar = agg.by_severity.action_required ?? 0;
  const w = agg.by_severity.warning ?? 0;
  if (ar > 0 || w > 0) {
    return { deliver: true, reason: "action_or_warning_nonzero" };
  }
  return {
    deliver: false,
    reason: "only_informational_skipped_use_force_webhook_or_DIGEST_NOTIFY_always",
  };
}

function buildSlackText(
  agg: ReturnType<typeof aggregate>,
  generatedAt: string,
): string {
  const sev = Object.entries(agg.by_severity)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
  const cat = Object.entries(agg.by_category)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return [
    "*DJCN — account deletion open ops*",
    `Generated: ${generatedAt}`,
    `Total open (view): ${agg.total}`,
    `By ops_severity: ${sev || "(none)"}`,
    `By ops_category: ${cat || "(none)"}`,
    "",
    "See docs/ACCOUNT_DATA_CONTROLS.md (execute / ack-stale / reconcile) and ACCOUNT_DELETION_ROUTINE_REVIEW.md.",
  ].join("\n");
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const webhookUrl = process.env.ACCOUNT_DELETION_OPS_WEBHOOK_URL?.trim();
  const webhookBearer = process.env.ACCOUNT_DELETION_OPS_WEBHOOK_BEARER?.trim();
  const notifyMode = parseNotifyMode();
  const webhookFormat = parseWebhookFormat();
  const forceWebhook = hasFlag("force-webhook");

  if (!url || !serviceKey) {
    console.error(
      JSON.stringify({
        level: "error",
        source: "djcn",
        category: "account_deletion",
        context: "account-deletion-ops-digest",
        detail: "missing_NEXT_PUBLIC_SUPABASE_URL_or_SUPABASE_SERVICE_ROLE_KEY",
      }),
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("v_account_deletion_open_ops")
    .select("*");

  if (error) {
    console.error(
      JSON.stringify({
        level: "error",
        source: "djcn",
        category: "account_deletion",
        context: "account-deletion-ops-digest",
        detail: error.message,
      }),
    );
    process.exit(1);
  }

  const rows = (data ?? []) as AccountDeletionOpenOpsRow[];
  const agg = aggregate(rows);
  const generatedAt = new Date().toISOString();

  const actionHighlights = rows
    .filter((r) => r.ops_severity === "action_required")
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      ops_category: r.ops_category,
      ops_severity: r.ops_severity,
      updated_at: r.updated_at,
      profile_handle_snapshot: r.profile_handle_snapshot,
    }));

  const webhookConfigured = Boolean(webhookUrl);
  const delivery = shouldDeliverWebhook(notifyMode, agg, forceWebhook);

  let webhookAttempt: {
    attempted: boolean;
    http_status?: number;
    error?: string;
    skipped_reason?: string;
  } = {
    attempted: false,
    skipped_reason: !webhookConfigured
      ? "ACCOUNT_DELETION_OPS_WEBHOOK_URL_unset_notifications_not_sent"
      : delivery.deliver
        ? undefined
        : delivery.reason,
  };

  const payloadJson = {
    source: "djcn",
    kind: "account_deletion_ops_digest",
    generated_at: generatedAt,
    summary: agg,
    action_required_highlights: actionHighlights,
    notify_mode: notifyMode,
    webhook_format_config: webhookFormat,
    webhook_configured: webhookConfigured,
    webhook_delivery: delivery.deliver ? "attempted" : "skipped",
    webhook_skip_or_disabled_reason:
      webhookConfigured && !delivery.deliver ? delivery.reason : undefined,
  };

  if (webhookConfigured && delivery.deliver) {
    const body =
      webhookFormat === "slack"
        ? JSON.stringify({ text: buildSlackText(agg, generatedAt) })
        : JSON.stringify(payloadJson);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (webhookBearer) {
      headers.Authorization = `Bearer ${webhookBearer}`;
    }

    webhookAttempt = { ...webhookAttempt, attempted: true };
    try {
      const res = await fetch(webhookUrl!, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(15_000),
      });
      webhookAttempt.http_status = res.status;
      if (!res.ok) {
        webhookAttempt.error = `http_${res.status}`;
      }
    } catch (e) {
      webhookAttempt.error = e instanceof Error ? e.message : String(e);
    }
  }

  const out = {
    level: "info" as const,
    source: "djcn" as const,
    category: "account_deletion" as const,
    context: "account-deletion-ops-digest",
    generated_at: generatedAt,
    summary: agg,
    action_required_highlights: actionHighlights,
    notify_mode: notifyMode,
    webhook_configured: webhookConfigured,
    webhook_delivery: webhookAttempt,
    /** Full payload also printed for log drains; webhook receives JSON or Slack text per format. */
    digest_payload: payloadJson,
  };

  console.info(JSON.stringify(out));
}

main().catch((e) => {
  console.error(
    JSON.stringify({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "account-deletion-ops-digest",
      detail: e instanceof Error ? e.message : String(e),
    }),
  );
  process.exit(1);
});
