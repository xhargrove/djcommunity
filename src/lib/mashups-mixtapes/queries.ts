import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBlockedProfileIdsForViewer } from "@/lib/trust/queries";
import type { MashupMixtapePostRow, ProfileRow } from "@/types/database";

export type MashupMixtapeListItem = MashupMixtapePostRow & {
  author: Pick<ProfileRow, "handle" | "display_name" | "avatar_url">;
};

export async function listMashupMixtapePosts(
  viewerProfileId: string | null,
  limit = 80,
): Promise<MashupMixtapeListItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .from("mashup_mixtape_posts")
    .select(
      "id, profile_id, title, description, download_url, kind, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const posts = (rows ?? []) as MashupMixtapePostRow[];
  if (posts.length === 0) {
    return [];
  }

  const blocked =
    viewerProfileId != null
      ? await getBlockedProfileIdsForViewer(viewerProfileId)
      : new Set<string>();

  const visible = posts.filter((p) => !blocked.has(p.profile_id));
  if (visible.length === 0) {
    return [];
  }

  const profileIds = [...new Set(visible.map((p) => p.profile_id))];
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .in("id", profileIds);

  if (pErr) {
    throw pErr;
  }

  const byId = new Map(
    (profiles ?? []).map((p) => [p.id, p as Pick<ProfileRow, "handle" | "display_name" | "avatar_url"> & { id: string }]),
  );

  return visible.map((post) => {
    const a = byId.get(post.profile_id);
    return {
      ...post,
      author: {
        handle: a?.handle ?? "unknown",
        display_name: a?.display_name ?? "Unknown",
        avatar_url: a?.avatar_url ?? null,
      },
    };
  });
}
