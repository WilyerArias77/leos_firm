import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Still uses the anon key, so RLS applies. It carries the admin session
 * cookie, which is what authorizes the dashboard.
 *
 * NEXT.JS 16: `cookies()` is async — synchronous access was removed.
 * The official @supabase/ssr docs still show the synchronous form.
 */
export async function createClient() {
  const env = getClientEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // `src/proxy.ts` refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
