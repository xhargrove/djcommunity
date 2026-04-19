"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { z } from "zod";

import { getSafeRedirectTarget } from "@/lib/auth/redirect";
import { ROUTES } from "@/lib/routes";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email before signing in.";
  }
  return message;
}

export function LoginForm({ nextParam }: { nextParam?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    startTransition(async () => {
      const supabase = getBrowserSupabaseClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (signError) {
        setError(mapAuthError(signError.message));
        return;
      }

      const target = getSafeRedirectTarget(nextParam);
      router.push(target);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-xs font-medium text-zinc-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-zinc-600 focus:ring-2 disabled:opacity-50"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-xs font-medium text-zinc-400">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="w-full rounded-md border border-[var(--border)] bg-zinc-950 px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-zinc-600 focus:ring-2 disabled:opacity-50"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Log in"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        No account?{" "}
        <Link
          href={ROUTES.signUp}
          className="font-medium text-zinc-300 underline underline-offset-2 hover:text-white"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
