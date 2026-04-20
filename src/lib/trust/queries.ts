import "server-only";

import { logServerError } from "@/lib/observability/server-log";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Profile IDs the viewer has blocked (hides their posts & replies for that viewer). */
export async function getBlockedProfileIdsForViewer(
  viewerProfileId: string,
): Promise<Set<string>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profile_blocks")
    .select("blocked_profile_id")
    .eq("blocker_profile_id", viewerProfileId);

  if (error || !data?.length) {
    if (error) {
      logServerError("getBlockedProfileIdsForViewer", error, "engagement");
    }
    return new Set();
  }

  return new Set(
    (data as { blocked_profile_id: string }[]).map((r) => r.blocked_profile_id),
  );
}

export async function viewerHasBlockedProfile(
  viewerProfileId: string,
  targetProfileId: string,
): Promise<boolean> {
  const s = await getBlockedProfileIdsForViewer(viewerProfileId);
  return s.has(targetProfileId);
}
