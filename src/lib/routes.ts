/** Canonical app paths — use these instead of string literals. */

export const ROUTES = {
  home: "/home",
  login: "/login",
  signUp: "/sign-up",
  root: "/",
  onboarding: "/onboarding",
  profileEdit: "/profile/edit",
  /** Account data / deletion requests — honest operator workflow, not automated erasure. */
  settingsData: "/settings/data",
  postEdit: (id: string) => `/posts/${id}/edit`,
  /** Mashups & mixtapes — external download/stream links from DJs. */
  mashupsMixtapes: "/mashups-mixtapes",
  /** Primary discovery surface (Instagram “Explore” energy). */
  explore: "/explore",
  exploreCity: (slug: string) => `/explore/${encodeURIComponent(slug)}`,
  create: "/create",
  rooms: "/rooms",
  roomsNew: "/rooms/new",
  room: (slug: string) => `/rooms/${encodeURIComponent(slug)}`,
  notifications: "/notifications",
  /** Platform staff (admin / owner). */
  admin: "/admin",
  /** Account deletion queue (admin / owner — manual fulfillment). */
  adminAccountDeletion: "/admin/account-deletion",
  adminTeam: "/admin/team",
  /** Content moderation queue (moderator, admin, owner). */
  adminModeration: "/admin/moderation",
  adminModerationReport: (id: string) =>
    `/admin/moderation/${encodeURIComponent(id)}`,
  /**
   * Future-facing roadmap (no billing). Honest entry point for creator / Pro surfaces.
   */
  creator: "/creator",
  /** Placeholder legal & contact (non-final copy). */
  terms: "/terms",
  privacy: "/privacy",
  contact: "/contact",
} as const;
