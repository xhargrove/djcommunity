"use client";

import { useTransition } from "react";

import { signOutAction } from "@/actions/auth";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOutAction())}
      className="rounded-md border border-[var(--border)] bg-zinc-900 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-zinc-800 disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
