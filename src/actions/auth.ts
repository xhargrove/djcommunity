"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

/**
 * Ends the session server-side and clears auth cookies.
 */
export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect(ROUTES.root);
}
