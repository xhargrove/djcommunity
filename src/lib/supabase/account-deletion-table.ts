import "server-only";

import type { Database } from "@/types/database";

type Insert = Database["public"]["Tables"]["account_deletion_requests"]["Insert"];
type Update = Database["public"]["Tables"]["account_deletion_requests"]["Update"];

/**
 * Hand-maintained table types + PostgREST v12 client inference can disagree until
 * `supabase gen types` is run after migrations. Payloads stay strict; the client is
 * intentionally untyped (`unknown`) because SSR `createServerClient` generics differ
 * slightly from `createClient<Database>`.
 */
export async function insertAccountDeletionRequest(
  client: unknown,
  row: Insert,
) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return await (client as any).from("account_deletion_requests").insert(row);
}

export async function cancelAccountDeletionRequestByUser(
  client: unknown,
  requestId: string,
  userId: string,
) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return await (client as any)
    .from("account_deletion_requests")
    .update({ status: "cancelled" } satisfies Update)
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id");
}

export async function updateAccountDeletionRequestStaff(
  client: unknown,
  requestId: string,
  row: Update,
  allowedStatuses: string[],
) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return await (client as any)
    .from("account_deletion_requests")
    .update(row)
    .eq("id", requestId)
    .in("status", allowedStatuses)
    .select("id");
}

export async function selectAccountDeletionRequests(
  client: unknown,
  options: {
    profileId?: string;
    status?: string;
    statuses?: string[];
    limit?: number;
    maybeSingle?: boolean;
    orderBy?: { column: string; ascending: boolean };
  },
) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let q = (client as any).from("account_deletion_requests").select("*");
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
