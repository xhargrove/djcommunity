import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

/**
 * Server Components, Server Actions, and Route Handlers only.
 * Creates a per-request client bound to the caller's cookies.
 */
export type ServerSupabaseClient = SupabaseClient<Database>;

export async function createServerSupabaseClient(): Promise<ServerSupabaseClient> {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getPublicEnv();

  // `@supabase/ssr` uses a schema generic that does not overlap `SupabaseClient<Database>`; cast once here so app code stays typed to `Database`.
  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component without mutable cookies; session refresh is handled in middleware.
          }
        },
      },
    },
  ) as unknown as ServerSupabaseClient;
}
