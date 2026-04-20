import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { profilePublicPath } from "@/lib/profile/paths";
import { ROUTES } from "@/lib/routes";
import type { ContentReportRow } from "@/types/database";

export type ReportTargetContext = {
  title: string;
  detail: string;
  href: string | null;
  externalLabel: string | null;
};

/**
 * Resolve enough context for triage without exposing raw IDs alone.
 */
export async function getReportTargetContext(
  report: ContentReportRow,
): Promise<ReportTargetContext> {
  const supabase = await createServerSupabaseClient();
  const kind = report.target_kind;

  switch (kind) {
    case "post": {
      const { data } = await supabase
        .from("posts")
        .select("id, caption, profile_id")
        .eq("id", report.target_id)
        .maybeSingle();
      const row = data as {
        id: string;
        caption: string;
        profile_id: string;
      } | null;
      if (!row) {
        return missing("Post may have been deleted.");
      }
      const { data: author } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", row.profile_id)
        .maybeSingle();
      const handle = (author as { handle: string } | null)?.handle;
      return {
        title: "Post",
        detail: row.caption?.trim()
          ? truncate(row.caption, 280)
          : "(no caption)",
        href: handle ? profilePublicPath(handle) : null,
        externalLabel: handle ? "Author profile" : null,
      };
    }
    case "post_comment": {
      const { data } = await supabase
        .from("post_comments")
        .select("id, body, post_id, profile_id")
        .eq("id", report.target_id)
        .maybeSingle();
      const row = data as {
        id: string;
        body: string;
        post_id: string;
        profile_id: string;
      } | null;
      if (!row) {
        return missing("Comment may have been deleted.");
      }
      const { data: author } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", row.profile_id)
        .maybeSingle();
      const handle = (author as { handle: string } | null)?.handle;
      return {
        title: "Post comment",
        detail: truncate(row.body, 400),
        href: handle ? profilePublicPath(handle) : null,
        externalLabel: handle ? "Commenter profile" : null,
      };
    }
    case "room": {
      const { data } = await supabase
        .from("rooms")
        .select("id, name, slug")
        .eq("id", report.target_id)
        .maybeSingle();
      const row = data as { id: string; name: string; slug: string } | null;
      if (!row) {
        return missing("Room may have been deleted.");
      }
      return {
        title: "Room",
        detail: row.name,
        href: ROUTES.room(row.slug),
        externalLabel: "Open room",
      };
    }
    case "room_message": {
      const { data } = await supabase
        .from("room_messages")
        .select("id, body, room_id")
        .eq("id", report.target_id)
        .maybeSingle();
      const row = data as {
        id: string;
        body: string;
        room_id: string;
      } | null;
      if (!row) {
        return missing("Message may have been deleted.");
      }
      const { data: room } = await supabase
        .from("rooms")
        .select("slug, name")
        .eq("id", row.room_id)
        .maybeSingle();
      const r = room as { slug: string; name: string } | null;
      return {
        title: "Room message",
        detail: truncate(row.body, 400),
        href: r ? ROUTES.room(r.slug) : null,
        externalLabel: r ? `Room: ${r.name}` : null,
      };
    }
    case "profile": {
      const { data } = await supabase
        .from("profiles")
        .select("id, handle, display_name")
        .eq("id", report.target_id)
        .maybeSingle();
      const row = data as {
        id: string;
        handle: string;
        display_name: string;
      } | null;
      if (!row) {
        return missing("Profile may have been deleted.");
      }
      return {
        title: "Profile",
        detail: `${row.display_name} (@${row.handle})`,
        href: profilePublicPath(row.handle),
        externalLabel: "Open profile",
      };
    }
    default:
      return missing("Unknown report target type.");
  }
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}

function missing(hint: string): ReportTargetContext {
  return {
    title: "Target",
    detail: hint,
    href: null,
    externalLabel: null,
  };
}
