"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { addCommentAction } from "@/actions/engagement";

function SubmitCommentButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
    >
      {pending ? "Posting…" : "Reply"}
    </button>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(addCommentAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="post_id" value={postId} />
      <label htmlFor={`comment-${postId}`} className="sr-only">
        Comment
      </label>
      <textarea
        id={`comment-${postId}`}
        name="body"
        rows={2}
        maxLength={2000}
        placeholder="Reply to this thread..."
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200"
      />
      {state && !state.ok ? (
        <p className="text-[11px] text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitCommentButton />
    </form>
  );
}
