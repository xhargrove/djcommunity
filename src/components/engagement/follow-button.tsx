"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleFollowAction } from "@/actions/engagement";
import { ROUTES } from "@/lib/routes";

export function FollowButton({
  targetProfileId,
  initialFollowing,
  viewerProfileId,
  isLoggedIn,
  loginNextPath,
}: {
  targetProfileId: string;
  initialFollowing: boolean;
  viewerProfileId: string | null;
  isLoggedIn: boolean;
  loginNextPath: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isLoggedIn && !viewerProfileId) {
    return (
      <Link
        href={ROUTES.onboarding}
        className="inline-flex w-fit rounded-md border border-amber-700/50 bg-amber-950/30 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-950/50"
      >
        Complete your profile to follow
      </Link>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col gap-1">
        <Link
          href={`${ROUTES.login}?next=${encodeURIComponent(loginNextPath)}`}
          className="inline-flex w-fit rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
        >
          Sign in to follow
        </Link>
        <Link
          href={`${ROUTES.signUp}?next=${encodeURIComponent(loginNextPath)}`}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Create an account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await toggleFollowAction(targetProfileId);
            if (!r.ok) {
              setError(r.error);
            } else {
              router.refresh();
            }
          });
        }}
        className={`w-fit rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          initialFollowing
            ? "border border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-900"
            : "bg-zinc-100 text-zinc-950 hover:bg-white"
        }`}
      >
        {pending ? "…" : initialFollowing ? "Following" : "Follow"}
      </button>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
