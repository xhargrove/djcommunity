"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/routes";

type Tab = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  icon: "home" | "explore" | "create" | "rooms" | "profile";
};

function Icon({
  name,
  active,
}: {
  name: Tab["icon"];
  active: boolean;
}) {
  const c = active ? "text-zinc-900" : "text-zinc-500";
  const stroke = "currentColor";
  const s = "h-6 w-6";
  switch (name) {
    case "home":
      return (
        <svg className={`${s} ${c}`} fill="none" viewBox="0 0 24 24" aria-hidden>
          <path
            stroke={stroke}
            strokeWidth={active ? 2.2 : 1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          />
        </svg>
      );
    case "explore":
      return (
        <svg className={`${s} ${c}`} fill="none" viewBox="0 0 24 24" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke={stroke} strokeWidth={active ? 2.2 : 1.6} />
          <path
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            d="m20 20-3-3"
          />
        </svg>
      );
    case "create":
      return (
        <svg className={`${s} ${c}`} fill="none" viewBox="0 0 24 24" aria-hidden>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="4"
            stroke={stroke}
            strokeWidth={active ? 2.2 : 1.6}
          />
          <path
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            d="M12 8v8M8 12h8"
          />
        </svg>
      );
    case "rooms":
      return (
        <svg className={`${s} ${c}`} fill="none" viewBox="0 0 24 24" aria-hidden>
          <path
            stroke={stroke}
            strokeWidth={active ? 2.2 : 1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h8M8 14h5"
          />
          <rect x="4" y="5" width="16" height="14" rx="2" stroke={stroke} strokeWidth={active ? 2.2 : 1.6} />
        </svg>
      );
    case "profile":
      return (
        <svg className={`${s} ${c}`} fill="none" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="9" r="3.5" stroke={stroke} strokeWidth={active ? 2.2 : 1.6} />
          <path
            stroke={stroke}
            strokeWidth={active ? 2.2 : 1.6}
            strokeLinecap="round"
            d="M6 19.5c.8-3 3.5-5 6-5s5.2 2 6 5"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function MobileTabNav({
  profileHref,
  profileActivePaths,
}: {
  /** `/u/handle` when onboarded, else onboarding */
  profileHref: string;
  /** Paths that keep the Profile tab active (e.g. public profile + edit) */
  profileActivePaths: string[];
}) {
  const pathname = usePathname() ?? "";

  const tabs: Tab[] = [
    {
      href: ROUTES.home,
      label: "Home",
      icon: "home",
      match: (p) => p === ROUTES.home || p === ROUTES.mashupsMixtapes,
    },
    {
      href: ROUTES.explore,
      label: "Explore",
      icon: "explore",
      match: (p) => p === ROUTES.explore || p.startsWith(`${ROUTES.explore}/`),
    },
    {
      href: ROUTES.create,
      label: "Create",
      icon: "create",
      match: (p) => p === ROUTES.create,
    },
    {
      href: ROUTES.rooms,
      label: "Rooms",
      icon: "rooms",
      match: (p) =>
        p === ROUTES.rooms ||
        p.startsWith("/rooms/"),
    },
    {
      href: profileHref,
      label: "Profile",
      icon: "profile",
      match: (p) => profileActivePaths.includes(p),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/90 bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href + tab.label}
              href={tab.href}
              className={`flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors ${
                active
                  ? "bg-amber-50 text-zinc-900 shadow-inner shadow-amber-900/5"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              }`}
            >
              <Icon name={tab.icon} active={active} />
              <span className="truncate text-[10px] font-semibold tracking-wide">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
