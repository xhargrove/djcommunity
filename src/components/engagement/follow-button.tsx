"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleFollowAction } from "@/actions/engagement";
import { PRODUCT_EVENTS } from "@/lib/analytics/events";
import { trackProductEvent } from "@/lib/analytics/track-client";
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
        className="inline-flex w-fit rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
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
          className="inline-flex w-fit rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Sign in to follow
        </Link>
        <Link
          href={`${ROUTES.signUp}?next=${encodeURIComponent(loginNextPath)}`}
          className="text-xs text-zinc-600 hover:text-zinc-900"
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
              trackProductEvent(PRODUCT_EVENTS.FOLLOW_TOGGLED, {
                target_profile_id: targetProfileId,
                now_following: String(!initialFollowing),
              });
              router.refresh();
            }
          });
        }}
        className={`w-fit rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          initialFollowing
            ? "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            : "bg-amber-600 text-white hover:bg-amber-700"
        }`}
      >
        {pending ? "…" : initialFollowing ? "Following" : "Follow"}
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
