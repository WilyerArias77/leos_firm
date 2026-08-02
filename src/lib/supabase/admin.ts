import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getClientEnv, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client with the service role key — BYPASSES RLS.
 *
 * ⚠️ Per `docs/03-security.md`: this key must never reach the browser.
 * The `server-only` import above turns any accidental client import into a
 * build error rather than a leak.
 *
 * Use it only for the automated flow that has no user session:
 * Square webhook, appointment creation, CRM writes, cron jobs.
 * For anything driven by a logged-in admin, prefer `./server.ts` so RLS
 * still applies.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getClientEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createSupabaseClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
