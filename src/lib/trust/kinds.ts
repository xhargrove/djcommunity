/** Report targets — shared by UI and server schema (no zod here for clean client bundles). */
export const REPORT_TARGET_KINDS = [
  "post",
  "post_comment",
  "room",
  "room_message",
  "profile",
] as const;

export type ReportTargetKind = (typeof REPORT_TARGET_KINDS)[number];
