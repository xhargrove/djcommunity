import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { selectAccountDeletionRequests } from "@/lib/supabase/account-deletion-table";
import type { AccountDeletionRequestRow } from "@/types/database";

export async function getPendingDeletionRequestForProfile(
  profileId: string,
): Promise<AccountDeletionRequestRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await selectAccountDeletionRequests(supabase, {
    profileId,
    status: "pending",
    limit: 1,
    maybeSingle: true,
  });

  if (error) {
    throw error;
  }
  return (data as AccountDeletionRequestRow | null) ?? null;
}

export type AccountDeletionQueueRow = AccountDeletionRequestRow & {
  handle: string;
  display_name: string;
};

/** Admin/owner queue — open requests first. */
export async function listAccountDeletionQueue(): Promise<
  AccountDeletionQueueRow[]
> {
  const supabase = await createServerSupabaseClient();
  const { data: rows, error } = await selectAccountDeletionRequests(supabase, {
    statuses: ["pending", "processing"],
    orderBy: { column: "created_at", ascending: true },
  });

  if (error) {
    throw error;
  }
  const list = (rows as AccountDeletionRequestRow[] | null) ?? [];
  if (list.length === 0) {
    return [];
  }

  const profileIds = [
    ...new Set(
      list
        .map((r) => r.profile_id)
        .filter((id): id is string => id != null),
    ),
  ];

  let profileRows: { id: string; handle: string; display_name: string }[] = [];
  if (profileIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, handle, display_name")
      .in("id", profileIds);

    if (pErr) {
      throw pErr;
    }

    profileRows = (profiles ?? []) as {
      id: string;
      handle: string;
      display_name: string;
    }[];
  }

  const byId = new Map(profileRows.map((p) => [p.id, p] as const));

  return list.map((r) => {
    const p = r.profile_id ? byId.get(r.profile_id) : undefined;
    return {
      ...r,
      handle: p?.handle ?? r.profile_handle_snapshot ?? "unknown",
      display_name: p?.display_name ?? r.profile_handle_snapshot ?? "Unknown",
    };
  });
}
