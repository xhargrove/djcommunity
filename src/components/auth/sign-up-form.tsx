"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { z } from "zod";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";

const signUpSchema = z
  .object({
    email: z.string().email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function mapSignUpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (lower.includes("password")) {
    return message;
  }
  if (lower.includes("signup") && lower.includes("not allowed")) {
    return "New sign-ups are disabled for this project.";
  }
  return message;
}

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    startTransition(async () => {
      const supabase = getBrowserSupabaseClient();
      const { data, error: signError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (signError) {
        setError(mapSignUpError(signError.message));
        return;
      }

      if (data.session) {
        router.push(ROUTES.home);
        router.refresh();
        return;
      }

      setInfo(
        "Check your email to confirm your account before signing in.",
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1">
        <label htmlFor="signup-email" className="text-xs font-medium text-zinc-400">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-zinc-300 focus:ring-2 disabled:opacity-50"
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="signup-password"
          className="text-xs font-medium text-zinc-400"
        >
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          disabled={pending}
          minLength={8}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-zinc-300 focus:ring-2 disabled:opacity-50"
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="signup-confirm"
          className="text-xs font-medium text-zinc-400"
        >
          Confirm password
        </label>
        <input
          id="signup-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          disabled={pending}
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-zinc-300 focus:ring-2 disabled:opacity-50"
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

      {info ? (
        <p
          role="status"
          className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
        >
          {info}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Sign up"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Already have an account?{" "}
        <Link
          href={ROUTES.login}
          className="font-medium text-zinc-300 underline underline-offset-2 hover:text-white"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
