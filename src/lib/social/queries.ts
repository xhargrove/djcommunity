import "server-only";

import { logServerError } from "@/lib/observability/server-log";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getFollowCounts(profileId: string): Promise<{
  followers: number;
  following: number;
}> {
  const supabase = await createServerSupabaseClient();

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId),
  ]);

  return {
    followers: followers ?? 0,
    following: following ?? 0,
  };
}

export async function isFollowing(
  viewerProfileId: string,
  targetProfileId: string,
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", viewerProfileId)
    .eq("following_id", targetProfileId)
    .maybeSingle();

  if (error) {
    logServerError("isFollowing", error, "engagement");
    return false;
  }
  return data != null;
}
