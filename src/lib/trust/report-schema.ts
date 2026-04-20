import { z } from "zod";

/** Must stay aligned with `REPORT_TARGET_KINDS` in `@/lib/trust/kinds`. */
export type { ReportTargetKind } from "@/lib/trust/kinds";

export const submitContentReportSchema = z.object({
  target_kind: z.enum([
    "post",
    "post_comment",
    "room",
    "room_message",
    "profile",
  ]),
  target_id: z.string().uuid(),
  note: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((s) => (s === undefined || s.length === 0 ? undefined : s)),
});
