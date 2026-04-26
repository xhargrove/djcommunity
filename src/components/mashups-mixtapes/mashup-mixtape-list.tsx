import Link from "next/link";

import { profilePublicPath } from "@/lib/profile/paths";
import type { MashupMixtapeListItem } from "@/lib/mashups-mixtapes/queries";

function kindLabel(kind: string): string {
  if (kind === "mashup") return "Mashup";
  if (kind === "mixtape") return "Mixtape";
  return "Other";
}

export function MashupMixtapeList({ items }: { items: MashupMixtapeListItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
        No posts yet. Be the first to share a mix or mashup link.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                {kindLabel(item.kind)}
              </p>
              <h3 className="mt-1 text-base font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                <Link
                  href={profilePublicPath(item.author.handle)}
                  className="font-medium text-zinc-700 hover:text-amber-800"
                >
                  {item.author.display_name}
                </Link>
                <span className="text-zinc-400"> · @{item.author.handle}</span>
                <span className="text-zinc-400">
                  {" "}
                  · {new Date(item.created_at).toLocaleString()}
                </span>
              </p>
            </div>
            <a
              href={item.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-950 transition hover:bg-amber-100"
            >
              Open link
            </a>
          </div>
          {item.description ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">{item.description}</p>
          ) : null}
          <p className="mt-2 text-[11px] text-zinc-400">
            External link — MixerHQ does not host files. Use trusted sources only.
          </p>
        </li>
      ))}
    </ul>
  );
}
