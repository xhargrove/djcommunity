import "server-only";

import type { Database } from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

/** Alias for the cookie-bound SSR client used by account deletion flows. */
export type AccountDeletionSupabase = ServerSupabaseClient;

type Insert = Database["public"]["Tables"]["account_deletion_requests"]["Insert"];
type Update = Database["public"]["Tables"]["account_deletion_requests"]["Update"];

export async function insertAccountDeletionRequest(
  client: AccountDeletionSupabase,
  row: Insert,
) {
  return client
    .from("account_deletion_requests")
    .insert(row)
    .select("id")
    .single();
}

export async function cancelAccountDeletionRequestByUser(
  client: AccountDeletionSupabase,
  requestId: string,
  userId: string,
) {
  return client
    .from("account_deletion_requests")
    .update({ status: "cancelled" } satisfies Update)
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id");
}

export async function updateAccountDeletionRequestStaff(
  client: AccountDeletionSupabase,
  requestId: string,
  row: Update,
  allowedStatuses: string[],
) {
  return client
    .from("account_deletion_requests")
    .update(row)
    .eq("id", requestId)
    .in("status", allowedStatuses)
    .select("id");
}

export async function selectAccountDeletionRequests(
  client: AccountDeletionSupabase,
  options: {
    profileId?: string;
    status?: string;
    statuses?: string[];
    limit?: number;
    maybeSingle?: boolean;
    orderBy?: { column: string; ascending: boolean };
  },
) {
  let q = client.from("account_deletion_requests").select("*");
  if (options.profileId) {
    q = q.eq("profile_id", options.profileId);
  }
  if (options.status) {
    q = q.eq("status", options.status);
  }
  if (options.statuses?.length) {
    q = q.in("status", options.statuses);
  }
  if (options.orderBy) {
    q = q.order(options.orderBy.column, {
      ascending: options.orderBy.ascending,
    });
  }
  if (options.limit !== undefined) {
    q = q.limit(options.limit);
  }
  if (options.maybeSingle) {
    return await q.maybeSingle();
  }
  return await q;
}
