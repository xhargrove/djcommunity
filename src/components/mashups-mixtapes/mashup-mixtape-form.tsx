"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  submitMashupMixtapeAction,
  type MashupMixtapeActionResult,
} from "@/actions/mashup-mixtape";

export function MashupMixtapeForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    submitMashupMixtapeAction,
    undefined as MashupMixtapeActionResult | undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Post a link</h2>
      <label className="block text-xs font-medium text-zinc-700">
        Title
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-300 focus:ring-2"
          placeholder="e.g. Summer 2026 club mix"
        />
      </label>
      <label className="block text-xs font-medium text-zinc-700">
        Type
        <select
          name="kind"
          className="mt-1 block w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          defaultValue="mixtape"
        >
          <option value="mixtape">Mixtape</option>
          <option value="mashup">Mashup</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-700">
        Download / stream link (https only)
        <input
          name="download_url"
          type="url"
          required
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-300 focus:ring-2"
          placeholder="https://…"
        />
      </label>
      <label className="block text-xs font-medium text-zinc-700">
        Description (optional)
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-300 focus:ring-2"
          placeholder="Tracklist, file format, password for ZIP, etc."
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-900/15 transition hover:bg-amber-700 disabled:opacity-60"
      >
        {pending ? "Posting…" : "Publish link"}
      </button>
      {state?.ok === false ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-sm font-medium text-emerald-800" role="status">
          Posted. Your link appears in the list below.
        </p>
      ) : null}
    </form>
  );
}
