import { createBrowserClient } from "@supabase/ssr";
import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client for the browser.
 *
 * Uses the anon key, so every query is subject to RLS. Per `docs/03-security.md`
 * the only table readable from here is `services`; everything else goes through
 * a Route Handler on the server.
 */
export function createClient() {
  const env = getClientEnv();

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
