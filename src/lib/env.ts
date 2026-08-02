import { z } from "zod";

/**
 * Environment variable validation (Mandamiento VIII).
 *
 * The app must fail loudly at startup when a required variable is missing,
 * never silently at runtime in the middle of a payment or a booking.
 *
 * Any variable added here must also be documented in the table in
 * `docs/02-architecture.md` and added to `.env.example`.
 */

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  SQUARE_ACCESS_TOKEN: z.string().min(1),
  SQUARE_ENVIRONMENT: z.enum(["sandbox", "production"]),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().min(1),

  GOOGLE_CLIENT_EMAIL: z.string().email(),
  GOOGLE_PRIVATE_KEY: z.string().min(1),
  GOOGLE_CALENDAR_ID: z.string().min(1),
  GOOGLE_IMPERSONATED_USER: z.string().email(),

  ANTHROPIC_API_KEY: z.string().min(1),
  ADMIN_NOTIFICATION_EMAIL: z.string().email(),
  CRON_SECRET: z.string().min(16),

  BUSINESS_TIMEZONE: z.string().default("America/Chicago"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SQUARE_APPLICATION_ID: z.string().min(1),
  NEXT_PUBLIC_SQUARE_LOCATION_ID: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function formatIssues(issues: z.core.$ZodIssue[]): string {
  return issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

/**
 * Server-side environment. Throws if anything is missing.
 *
 * Never import this from a Client Component — it reads secrets.
 */
export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatIssues(parsed.error.issues)}\n` +
        `See .env.example and docs/02-architecture.md`,
    );
  }

  return parsed.data;
}

/**
 * Public environment. Safe to use in the browser.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time, so each value must be
 * referenced explicitly — `process.env[key]` would not be replaced.
 */
export function getClientEnv(): ClientEnv {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SQUARE_APPLICATION_ID: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    NEXT_PUBLIC_SQUARE_LOCATION_ID: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables:\n${formatIssues(parsed.error.issues)}\n` +
        `See .env.example and docs/02-architecture.md`,
    );
  }

  return parsed.data;
}

/**
 * Google service-account keys are stored with escaped newlines in `.env`.
 * The Google SDK needs the real newlines back.
 */
export function normalizeGooglePrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}
