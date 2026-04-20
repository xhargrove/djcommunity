"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  removeProfileBannerAction,
  uploadProfileAvatarAction,
  uploadProfileBannerAction,
  type ProfileActionResult,
} from "@/actions/profile";

function mapResult(result: ProfileActionResult): string | null {
  if (!result.ok) {
    return result.error;
  }
  return null;
}

export function ProfileMediaSection({
  avatarUrl,
  bannerUrl,
}: {
  avatarUrl: string | null;
  bannerUrl: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(
    fn: (fd: FormData) => Promise<ProfileActionResult>,
    formData: FormData,
  ) {
    setError(null);
    setPending(true);
    try {
      const res = await fn(formData);
      const err = mapResult(res);
      if (err) {
        setError(err);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onAvatar(formData: FormData) {
    await run(uploadProfileAvatarAction, formData);
  }

  async function onBanner(formData: FormData) {
    await run(uploadProfileBannerAction, formData);
  }

  async function onRemoveBanner() {
    setError(null);
    setPending(true);
    try {
      const res = await removeProfileBannerAction();
      const err = mapResult(res);
      if (err) {
        setError(err);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-md shadow-zinc-200/40 ring-1 ring-zinc-100">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">
        Profile images
      </h2>
      <p className="text-xs text-zinc-500">
        JPEG, PNG, WebP, or GIF. Avatar max 5MB; banner max 8MB. New uploads
        replace the previous file in storage.
      </p>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <form action={onAvatar} className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">Avatar</label>
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={pending}
            className="block w-full max-w-xs text-xs text-zinc-600 file:mr-2 file:rounded-full file:border file:border-zinc-200 file:bg-zinc-50 file:px-3 file:py-1.5 file:text-zinc-800 hover:file:bg-zinc-100"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Upload avatar"}
          </button>
        </form>
        {avatarUrl ? (
          <p className="text-xs text-zinc-500">
            Current file is linked to your profile.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <form action={onBanner} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-zinc-400">Banner</label>
            <input
              type="file"
              name="banner"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={pending}
              className="block w-full max-w-xs text-xs text-zinc-600 file:mr-2 file:rounded-full file:border file:border-zinc-200 file:bg-zinc-50 file:px-3 file:py-1.5 file:text-zinc-800 hover:file:bg-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Upload banner"}
          </button>
        </form>
        {bannerUrl ? (
          <button
            type="button"
            onClick={onRemoveBanner}
            disabled={pending}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            Remove banner
          </button>
        ) : null}
      </div>
    </div>
  );
}
