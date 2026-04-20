import "server-only";

import { logServerError } from "@/lib/observability/server-log";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ContentReportRow,
  ContentReportTriageRow,
  ProfileRow,
} from "@/types/database";

export type ModerationReportStatus = "open" | "reviewed" | "dismissed";

export type ModerationListFilters = {
  status?: ModerationReportStatus | "all";
  targetKind?: string | "all";
};

export type ModerationReportListItem = ContentReportRow & {
  reporter: Pick<ProfileRow, "id" | "handle" | "display_name">;
  triage: ContentReportTriageRow | null;
};

const PAGE_SIZE = 40;

async function fetchTriageMap(
  reportIds: string[],
): Promise<Map<string, ContentReportTriageRow>> {
  if (reportIds.length === 0) {
    return new Map();
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_report_triage")
    .select("*")
    .in("report_id", [...new Set(reportIds)]);

  if (error) {
    logServerError("fetchTriageMap", error, "moderation");
    return new Map();
  }

  const m = new Map<string, ContentReportTriageRow>();
  for (const row of (data ?? []) as ContentReportTriageRow[]) {
    m.set(row.report_id, row);
  }
  return m;
}

export async function listContentReportsForModeration(
  filters: ModerationListFilters,
): Promise<ModerationReportListItem[]> {
  const supabase = await createServerSupabaseClient();
  let q = supabase
    .from("content_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (filters.status && filters.status !== "all") {
    q = q.eq("status", filters.status);
  }
  if (filters.targetKind && filters.targetKind !== "all") {
    q = q.eq("target_kind", filters.targetKind);
  }

  const { data: rows, error } = await q;
  if (error) {
    logServerError("listContentReportsForModeration", error, "moderation");
    return [];
  }

  const reports = (rows ?? []) as ContentReportRow[];
  if (reports.length === 0) {
    return [];
  }

  const triageMap = await fetchTriageMap(reports.map((r) => r.id));

  const reporterIds = [...new Set(reports.map((r) => r.reporter_profile_id))];
  const { data: profs, error: pErr } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", reporterIds);

  if (pErr) {
    logServerError("listContentReportsForModeration profiles", pErr, "moderation");
    return [];
  }

  const byId = new Map(
    ((profs ?? []) as Pick<ProfileRow, "id" | "handle" | "display_name">[]).map(
      (p) => [p.id, p],
    ),
  );

  return reports.map((r) => {
    const reporter = byId.get(r.reporter_profile_id);
    return {
      ...r,
      triage: triageMap.get(r.id) ?? null,
      reporter:
        reporter ?? {
          id: r.reporter_profile_id,
          handle: "?",
          display_name: "Unknown",
        },
    };
  });
}

export async function getContentReportByIdForModeration(
  id: string,
): Promise<{ report: ContentReportRow; triage: ContentReportTriageRow | null } | null> {
  const supabase = await createServerSupabaseClient();
  const { data: reportRaw, error: rErr } = await supabase
    .from("content_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (rErr) {
    logServerError("getContentReportByIdForModeration report", rErr, "moderation");
    return null;
  }
  if (!reportRaw) {
    return null;
  }

  const report = reportRaw as ContentReportRow;

  const { data: triageRaw, error: tErr } = await supabase
    .from("content_report_triage")
    .select("*")
    .eq("report_id", id)
    .maybeSingle();

  if (tErr) {
    logServerError("getContentReportByIdForModeration triage", tErr, "moderation");
    return { report, triage: null };
  }

  return {
    report,
    triage: (triageRaw as ContentReportTriageRow | null) ?? null,
  };
}

export async function getProfilesByIds(
  ids: string[],
): Promise<Map<string, Pick<ProfileRow, "id" | "handle" | "display_name">>> {
  if (ids.length === 0) {
    return new Map();
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", [...new Set(ids)]);

  if (error) {
    logServerError("getProfilesByIds", error, "moderation");
    return new Map();
  }

  const m = new Map<
    string,
    Pick<ProfileRow, "id" | "handle" | "display_name">
  >();
  for (const p of (data ?? []) as Pick<
    ProfileRow,
    "id" | "handle" | "display_name"
  >[]) {
    m.set(p.id, p);
  }
  return m;
}
