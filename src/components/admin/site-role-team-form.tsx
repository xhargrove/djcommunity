"use client";

import { useState } from "react";

import { setProfileSiteRoleAction } from "@/actions/site-role";

export function SiteRoleTeamForm() {
  const [handle, setHandle] = useState("");
  const [siteRole, setSiteRole] = useState<
    "member" | "moderator" | "admin" | "owner"
  >("admin");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      const r = await setProfileSiteRoleAction({ handle, site_role: siteRole });
      if (r.ok) {
        setMessage("Saved.");
        setHandle("");
      } else {
        setMessage(r.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="staff-handle" className="block text-xs font-medium text-zinc-700">
          Profile handle
        </label>
        <input
          id="staff-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="mt-1 w-full max-w-md rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          placeholder="djhandle"
          autoComplete="off"
          required
        />
      </div>
      <div>
        <label htmlFor="staff-role" className="block text-xs font-medium text-zinc-700">
          Site role
        </label>
        <select
          id="staff-role"
          value={siteRole}
          onChange={(e) =>
            setSiteRole(
              e.target.value as "member" | "moderator" | "admin" | "owner",
            )
          }
          className="mt-1 w-full max-w-md rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        >
          <option value="member">Member (remove staff)</option>
          <option value="moderator">Moderator (content triage)</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update role"}
      </button>
      {message ? (
        <p
          className={`text-sm ${message === "Saved." ? "text-emerald-700" : "text-red-700"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
