"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { addCommentAction } from "@/actions/engagement";

function SubmitCommentButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
    >
      {pending ? "Posting…" : "Comment"}
    </button>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(addCommentAction, undefined);

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
        placeholder="Add a comment…"
        className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
      />
      {state && !state.ok ? (
        <p className="text-[11px] text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitCommentButton />
    </form>
  );
}
