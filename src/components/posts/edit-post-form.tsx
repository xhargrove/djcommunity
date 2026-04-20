"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { updatePostAction, type PostUpdateResult } from "@/actions/posts";
import {
  POST_TYPE_LABELS,
  POST_TYPES_EDITABLE,
  type EditablePostType,
} from "@/lib/posts/constants";
import { ROUTES } from "@/lib/routes";
import type { PostRow } from "@/types/database";

async function editFormAction(
  _prev: PostUpdateResult | undefined,
  formData: FormData,
): Promise<PostUpdateResult> {
  return updatePostAction(formData);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function EditPostForm({ post }: { post: PostRow }) {
  const router = useRouter();
  const [state, formAction] = useActionState(editFormAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push(ROUTES.home);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="post_id" value={post.id} />
      <div className="space-y-1">
        <label htmlFor="caption" className="text-xs font-medium text-zinc-400">
          Caption
        </label>
        <textarea
          id="caption"
          name="caption"
          required
          rows={5}
          maxLength={5000}
          defaultValue={post.caption}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
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
          defaultValue={post.post_type}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          {POST_TYPES_EDITABLE.map((t: EditablePostType) => (
            <option key={t} value={t}>
              {POST_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
