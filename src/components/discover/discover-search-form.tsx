import type { TaxonomyFilters } from "@/lib/discovery/queries";

type Props = {
  action: string;
  defaultQuery: string;
  taxonomy: TaxonomyFilters;
  /** When set, city filter is fixed (city-scoped page). */
  lockedCitySlug?: string;
  defaultCitySlug: string;
  defaultGenreSlug: string;
  defaultDjTypeSlug: string;
};

export function DiscoverSearchForm({
  action,
  defaultQuery,
  taxonomy,
  lockedCitySlug,
  defaultCitySlug,
  defaultGenreSlug,
  defaultDjTypeSlug,
}: Props) {
  return (
    <form
      method="get"
      action={action}
      className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--background)]/60 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[200px] flex-1 space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Search
          </span>
          <input
            name="q"
            type="search"
            defaultValue={defaultQuery}
            placeholder="Handles, names, rooms, captions…"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            autoComplete="off"
          />
        </label>

        {!lockedCitySlug ? (
          <label className="min-w-[160px] space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              City
            </span>
            <select
              name="city"
              defaultValue={defaultCitySlug}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
            >
              <option value="">Any city</option>
              {taxonomy.cities.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="min-w-[140px] space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              City
            </span>
            <p className="rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300">
              {taxonomy.cities.find((c) => c.slug === lockedCitySlug)?.name ??
                lockedCitySlug}
            </p>
          </div>
        )}

        <label className="min-w-[160px] space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Genre
          </span>
          <select
            name="genre"
            defaultValue={defaultGenreSlug}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            <option value="">Any genre</option>
            {taxonomy.genres.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-[180px] space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            DJ type
          </span>
          <select
            name="djType"
            defaultValue={defaultDjTypeSlug}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            <option value="">Any type</option>
            {taxonomy.djTypes.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Apply
        </button>
      </div>
      <p className="text-xs text-zinc-600">
        Post search matches caption text. Profile and room search match names and handles.
        Trending uses real like counts; rising uses recent post counts per DJ.
      </p>
    </form>
  );
}
