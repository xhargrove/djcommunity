/** Canonical app paths — use these instead of string literals. */

export const ROUTES = {
  home: "/home",
  login: "/login",
  signUp: "/sign-up",
  root: "/",
  onboarding: "/onboarding",
  profileEdit: "/profile/edit",
  postEdit: (id: string) => `/posts/${id}/edit`,
  rooms: "/rooms",
  roomsNew: "/rooms/new",
  room: (slug: string) => `/rooms/${encodeURIComponent(slug)}`,
} as const;
