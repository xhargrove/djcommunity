import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { PublicEnv } from "./env";

let client: SupabaseClient | null = null;

/**
 * Native Supabase client: persisted session in AsyncStorage (not Next cookies).
 * Call once after env validation succeeds.
 */
export function getSupabaseClient(env: PublicEnv): SupabaseClient {
  if (client) {
    return client;
  }

  client = createClient(
    env.EXPO_PUBLIC_SUPABASE_URL,
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    },
  );

  return client;
}
