/**
 * Read-only snapshot of `v_account_deletion_open_ops` (service role).
 * Prints JSON to stdout for weekly review or log capture — does not mutate data.
 *
 *   npm run ops:account-deletion
 *
 * @see docs/ACCOUNT_DELETION_ROUTINE_REVIEW.md
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.error(
      JSON.stringify({
        level: "error",
        source: "djcn",
        category: "account_deletion",
        context: "account-deletion-ops-snapshot",
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
        context: "account-deletion-ops-snapshot",
        detail: error.message,
      }),
    );
    process.exit(1);
  }

  const severityRank: Record<string, number> = {
    action_required: 0,
    warning: 1,
    informational: 2,
  };
  const rows = (data ?? []).slice().sort((a, b) => {
    const ra = severityRank[a.ops_severity] ?? 9;
    const rb = severityRank[b.ops_severity] ?? 9;
    if (ra !== rb) {
      return ra - rb;
    }
    return (
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    );
  });

  const out = {
    level: "info" as const,
    source: "djcn" as const,
    category: "account_deletion" as const,
    context: "account-deletion-ops-snapshot",
    count: rows.length,
    rows,
  };
  console.info(JSON.stringify(out));
}

main().catch((e) => {
  console.error(
    JSON.stringify({
      level: "error",
      source: "djcn",
      category: "account_deletion",
      context: "account-deletion-ops-snapshot",
      detail: e instanceof Error ? e.message : String(e),
    }),
  );
  process.exit(1);
});
