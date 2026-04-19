"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { createPostAction } from "@/actions/posts";
import { POST_TYPE_LABELS, POST_TYPES, type PostType } from "@/lib/posts/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
    >
      {pending ? "Posting…" : "Post"}
    </button>
  );
}

export function CreatePostForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createPostAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-zinc-950/40 p-4">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">New post</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Images (JPG, PNG, WebP, GIF up to 8MB) or short video (MP4, WebM, MOV up to 50MB).
      </p>
      <form ref={formRef} action={formAction} className="mt-4 space-y-4">
        <div className="space-y-1">
          <label htmlFor="caption" className="text-xs font-medium text-zinc-400">
            Caption
          </label>
          <textarea
            id="caption"
            name="caption"
            required
            rows={3}
            maxLength={5000}
            className="w-full rounded-md border border-[var(--border)] bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            placeholder="What are you sharing?"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="post_type" className="text-xs font-medium text-zinc-400">
            Post type
          </label>
          <select
            id="post_type"
            name="post_type"
            required
            defaultValue="standard"
            className="w-full rounded-md border border-[var(--border)] bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          >
            {POST_TYPES.map((t: PostType) => (
              <option key={t} value={t}>
                {POST_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="media" className="text-xs font-medium text-zinc-400">
            Media (optional)
          </label>
          <input
            id="media"
            name="media"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-zinc-200"
          />
        </div>
        {state && !state.ok ? (
          <p className="text-sm text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}
        <SubmitButton />
      </form>
    </section>
  );
}
