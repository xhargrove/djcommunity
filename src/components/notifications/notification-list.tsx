import Link from "next/link";

import {
  markAllNotificationsReadAction,
  markNotificationReadFormAction,
} from "@/actions/notifications";
import type { NotificationListItem } from "@/lib/notifications/queries";
import { profilePublicPath } from "@/lib/profile/paths";
import { ROUTES } from "@/lib/routes";
import { EmptyState } from "@/components/ui/empty-state";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function summary(n: NotificationListItem): { text: string; href: string } {
  const name = n.actor.display_name || "Someone";
  const handle = n.actor.handle || "";
  switch (n.type) {
    case "follow":
      return {
        text:
          handle && handle !== "?"
            ? `${name} (@${handle}) started following you`
            : `${name} started following you`,
        href:
          handle && handle !== "?"
            ? profilePublicPath(handle)
            : ROUTES.home,
      };
    case "post_like":
      return {
        text: `${name} liked your post`,
        href: ROUTES.home,
      };
    case "post_comment":
      return {
        text: `${name} commented on your post`,
        href: ROUTES.home,
      };
    case "room_message":
      return {
        text: `${name} posted in ${n.room?.name ?? "a room"}`,
        href: n.room ? ROUTES.room(n.room.slug) : ROUTES.rooms,
      };
    default:
      return {
        text: "Notification",
        href: ROUTES.home,
      };
  }
}

function typeBadge(type: NotificationListItem["type"]): {
  label: string;
  tone: string;
} {
  switch (type) {
    case "follow":
      return { label: "Follow", tone: "bg-sky-100 text-sky-800" };
    case "post_like":
      return { label: "Like", tone: "bg-rose-100 text-rose-800" };
    case "post_comment":
      return { label: "Comment", tone: "bg-amber-100 text-amber-900" };
    case "room_message":
      return { label: "Room", tone: "bg-violet-100 text-violet-800" };
    default:
      return { label: "Alert", tone: "bg-zinc-100 text-zinc-700" };
  }
}

export function NotificationList({
  items,
}: {
  items: NotificationListItem[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="You're all caught up"
        description="When someone likes, comments, follows, or pings your room activity, it shows up here."
      />
    );
  }

  const unread = items.filter((n) => !n.read_at);
  const read = items.filter((n) => Boolean(n.read_at));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-600">
          <span className="font-medium text-zinc-900">{unread.length}</span> unread ·{" "}
          <span className="font-medium text-zinc-900">{items.length}</span> total
        </p>
        <form action={markAllNotificationsReadAction}>
          <button
            type="submit"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
          >
            Mark all read
          </button>
        </form>
      </div>

      {unread.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Unread
          </h2>
          <ul className="space-y-2">
            {unread.map((n) => {
              const { text, href } = summary(n);
              const badge = typeBadge(n.type);
              return (
                <li
                  key={n.id}
                  className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3 ring-1 ring-amber-100"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.tone}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] font-medium text-amber-800">Unread</span>
                      </div>
                      <p className="text-sm text-zinc-900">{text}</p>
                      <p className="mt-1 text-xs text-zinc-500">{formatWhen(n.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={href}
                        className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                      >
                        Open
                      </Link>
                      <form action={markNotificationReadFormAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Mark read
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {read.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
            Earlier
          </h2>
          <ul className="space-y-2">
            {read.map((n) => {
              const { text, href } = summary(n);
              const badge = typeBadge(n.type);
              return (
                <li
                  key={n.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-3 ring-1 ring-zinc-100"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.tone}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-800">{text}</p>
                      <p className="mt-1 text-xs text-zinc-600">{formatWhen(n.created_at)}</p>
                    </div>
                    <Link
                      href={href}
                      className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
