import type { Json } from "@/types/database";

export type ProfileLink = { label: string; url: string };

export function linksFromJson(links: Json): ProfileLink[] {
  if (!Array.isArray(links)) {
    return [];
  }
  const out: ProfileLink[] = [];
  for (const item of links) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const o = item as Record<string, unknown>;
    const label = o.label;
    const url = o.url;
    if (typeof label === "string" && typeof url === "string") {
      out.push({ label, url });
    }
  }
  return out;
}
