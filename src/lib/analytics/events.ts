/**
 * Canonical product analytics event names (string literals for grep-ability).
 * Wire `trackProductEvent` from client components after successful server actions.
 *
 * When adding a new enum-backed feature, prefer one event per meaningful outcome.
 * Optional: connect `window.gtag` in production if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set.
 */

export const PRODUCT_EVENTS = {
  ONBOARDING_COMPLETE: "onboarding_complete",
  POST_CREATED: "post_created",
  FOLLOW_TOGGLED: "follow_toggled",
  POST_SAVE_TOGGLED: "post_save_toggled",
  ROOM_JOINED: "room_joined",
  ROOM_CREATED: "room_created",
  REPORT_SUBMITTED: "report_submitted",
} as const;

export type ProductEventName =
  (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];
