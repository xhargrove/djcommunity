"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  createProfileAction,
  updateProfileAction,
  type ProfileActionResult,
} from "@/actions/profile";
import { linksFromJson } from "@/lib/profile/links";
import { profilePayloadSchema } from "@/lib/profile/schema";
import { ROUTES } from "@/lib/routes";
import type { CityRow, DjTypeRow, GenreRow, ProfileRow } from "@/types/database";

export type ProfileTaxonomy = {
  cities: CityRow[];
  genres: GenreRow[];
  djTypes: DjTypeRow[];
};

function buildPayload(
  form: FormData,
  links: { label: string; url: string }[],
) {
  const handle = String(form.get("handle") ?? "");
  const display_name = String(form.get("display_name") ?? "");
  const bio = String(form.get("bio") ?? "");
  const city_id = String(form.get("city_id") ?? "");
  const dj_type_id = String(form.get("dj_type_id") ?? "");
  const gear_setup = String(form.get("gear_setup") ?? "");
  const featured_mix_link = String(form.get("featured_mix_link") ?? "");
  const booking_contact = String(form.get("booking_contact") ?? "");

  const genreRaw = form.getAll("genre_id");
  const genre_ids = genreRaw.filter((v): v is string => typeof v === "string");

  const cleanLinks = links
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    .filter((l) => l.label.length > 0 && l.url.length > 0);

  return {
    handle,
    display_name,
    bio: bio.trim() === "" ? null : bio,
    city_id,
    genre_ids,
    dj_type_id,
    gear_setup: gear_setup.trim() === "" ? null : gear_setup,
    links: cleanLinks,
    featured_mix_link:
      featured_mix_link.trim() === "" ? null : featured_mix_link,
    booking_contact:
      booking_contact.trim() === "" ? null : booking_contact,
  };
}

export function ProfileForm({
  mode,
  initial,
  initialGenreIds,
  taxonomy,
}: {
  mode: "create" | "edit";
  initial: ProfileRow | null;
  initialGenreIds: string[];
  taxonomy: ProfileTaxonomy;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [links, setLinks] = useState<{ label: string; url: string }[]>(() =>
    initial ? linksFromJson(initial.links) : [],
  );

  const defaults = useMemo(() => {
    const firstCity = taxonomy.cities[0]?.id ?? "";
    const firstDj = taxonomy.djTypes[0]?.id ?? "";
    if (!initial) {
      return {
        handle: "",
        display_name: "",
        bio: "",
        city_id: firstCity,
        dj_type_id: firstDj,
        gear_setup: "",
        featured_mix_link: "",
        booking_contact: "",
      };
    }
    return {
      handle: initial.handle,
      display_name: initial.display_name,
      bio: initial.bio ?? "",
      city_id: initial.city_id,
      dj_type_id: initial.dj_type_id,
      gear_setup: initial.gear_setup ?? "",
      featured_mix_link: initial.featured_mix_link ?? "",
      booking_contact: initial.booking_contact ?? "",
    };
  }, [initial, taxonomy.cities, taxonomy.djTypes]);

  function addLink() {
    setLinks((prev) =>
      prev.length >= 10 ? prev : [...prev, { label: "", url: "" }],
    );
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateLink(
    i: number,
    field: "label" | "url",
    value: string,
  ) {
    setLinks((prev) =>
      prev.map((row, idx) =>
        idx === i ? { ...row, [field]: value } : row,
      ),
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const raw = buildPayload(form, links);

    const parsed = profilePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    startTransition(async () => {
      let result: ProfileActionResult;
      if (mode === "create") {
        result = await createProfileAction(parsed.data);
      } else {
        result = await updateProfileAction(parsed.data);
      }

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (mode === "create") {
        router.push(ROUTES.home);
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="handle" className="text-xs font-medium text-zinc-400">
            Handle <span className="text-red-400">*</span>
          </label>
          <input
            id="handle"
            name="handle"
            required
            readOnly={mode === "edit"}
            disabled={pending}
            defaultValue={defaults.handle}
            autoComplete="off"
            className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-zinc-600 read-only:cursor-not-allowed read-only:opacity-70 disabled:opacity-60"
          />
          {mode === "edit" ? (
            <p className="text-xs text-zinc-500">
              Handle cannot be changed after creation.
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              3–30 chars: lowercase letters, numbers, underscores; not
              leading/trailing underscore.
            </p>
          )}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label
            htmlFor="display_name"
            className="text-xs font-medium text-zinc-400"
          >
            Display name <span className="text-red-400">*</span>
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            disabled={pending}
            defaultValue={defaults.display_name}
            className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="bio" className="text-xs font-medium text-zinc-400">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            disabled={pending}
            defaultValue={defaults.bio}
            className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="city_id" className="text-xs font-medium text-zinc-400">
            City <span className="text-red-400">*</span>
          </label>
          <select
            id="city_id"
            name="city_id"
            required
            disabled={pending}
            defaultValue={defaults.city_id}
            className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
          >
            {taxonomy.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.region ? `${c.name}, ${c.region}` : c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <span className="text-xs font-medium text-zinc-400">
            Genres <span className="text-red-400">*</span>
          </span>
          <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-[var(--border)] bg-zinc-950/50 p-3 sm:grid-cols-3">
            {taxonomy.genres.map((g) => {
              const checked =
                mode === "edit" ? initialGenreIds.includes(g.id) : false;
              return (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300"
                >
                  <input
                    type="checkbox"
                    name="genre_id"
                    value={g.id}
                    defaultChecked={checked}
                    disabled={pending}
                    className="rounded border-zinc-600"
                  />
                  {g.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label
            htmlFor="dj_type_id"
            className="text-xs font-medium text-zinc-400"
          >
            DJ type <span className="text-red-400">*</span>
          </label>
          <select
            id="dj_type_id"
            name="dj_type_id"
            required
            disabled={pending}
            defaultValue={defaults.dj_type_id}
            className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
          >
            {taxonomy.djTypes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label
            htmlFor="gear_setup"
            className="text-xs font-medium text-zinc-400"
          >
            Gear setup
          </label>
          <textarea
            id="gear_setup"
            name="gear_setup"
            rows={3}
            disabled={pending}
            defaultValue={defaults.gear_setup}
            className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Links</span>
            <button
              type="button"
              onClick={addLink}
              disabled={pending || links.length >= 10}
              className="text-xs font-medium text-zinc-400 underline hover:text-white disabled:opacity-40"
            >
              Add link
            </button>
          </div>
          {links.length === 0 ? (
            <p className="text-xs text-zinc-500">No links yet.</p>
          ) : (
            <ul className="space-y-2">
              {links.map((link, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-zinc-950/50 p-3 sm:flex-row"
                >
                  <input
                    aria-label="Link label"
                    value={link.label}
                    onChange={(ev) => updateLink(i, "label", ev.target.value)}
                    placeholder="Label"
                    disabled={pending}
                    className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm disabled:opacity-50"
                  />
                  <input
                    aria-label="URL"
                    value={link.url}
                    onChange={(ev) => updateLink(i, "url", ev.target.value)}
                    placeholder="https://"
                    disabled={pending}
                    className="flex-[2] rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    disabled={pending}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label
            htmlFor="featured_mix_link"
            className="text-xs font-medium text-zinc-400"
          >
            Featured mix link
          </label>
          <input
            id="featured_mix_link"
            name="featured_mix_link"
            type="url"
            disabled={pending}
            defaultValue={defaults.featured_mix_link}
            placeholder="https://"
            className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label
            htmlFor="booking_contact"
            className="text-xs font-medium text-zinc-400"
          >
            Booking / inquiries
          </label>
          <input
            id="booking_contact"
            name="booking_contact"
            disabled={pending}
            defaultValue={defaults.booking_contact}
            placeholder="Email, phone, or booking URL"
            className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
          />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
      >
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Create profile"
            : "Save changes"}
      </button>
    </form>
  );
}
