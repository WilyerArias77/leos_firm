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

/**
 * n8n webhooks — the integration layer (ADR-010).
 *
 * Validated apart from `serverSchema` on purpose: Square, Google and Anthropic
 * are not configured yet, so demanding all of them to read two n8n variables
 * would take down the only integration that IS live.
 */
const n8nSchema = z.object({
  N8N_CRM_WEBHOOK_URL: z.string().url(),
  N8N_WEBHOOK_TOKEN: z.string().min(16),

  /**
   * Scheduling webhooks (FASE 5). **Optional on purpose.**
   *
   * They are being built by someone else, in parallel, so requiring them would
   * take down the CRM — the one integration that IS live — until they exist.
   * When one is missing, `requestFromN8n` falls back to a local mock outside
   * production and refuses to answer inside it (`features/scheduling.md`
   * § Mientras no existan las URLs).
   */
  N8N_AVAILABILITY_WEBHOOK_URL: z.string().url().optional(),
  N8N_BOOKING_WEBHOOK_URL: z.string().url().optional(),
  N8N_CONFIRM_WEBHOOK_URL: z.string().url().optional(),

  /** Payment registry — `Leos Firm - Registrar pago` (FASE 6, ADR-013). */
  N8N_PAYMENTS_WEBHOOK_URL: z.string().url().optional(),

  /**
   * Appointment management (FASE 9) — `features/appointment-management.md`.
   *
   * Optional for the same reason the scheduling ones are: the workflows are
   * created but not published yet, and requiring them would take down the CRM
   * and the checkout, which do work. Outside production the mock answers; in
   * production a missing URL is a `502` with the firm's phone number.
   */
  N8N_APPOINTMENT_WEBHOOK_URL: z.string().url().optional(),
  N8N_CANCEL_WEBHOOK_URL: z.string().url().optional(),
  N8N_RESCHEDULE_WEBHOOK_URL: z.string().url().optional(),
});

/**
 * Square (FASE 6) — validated apart from `serverSchema` for the same reason n8n
 * is: that schema demands Supabase, Google and Anthropic keys that this project
 * does not have and, for Supabase, never will (ADR-010). Reading it to take a
 * payment would throw over variables the payment does not use.
 *
 * `SQUARE_WEBHOOK_SIGNATURE_KEY` is the one optional field here, and not out of
 * laziness: Square only issues it when the webhook SUBSCRIPTION is created, and
 * that needs a public URL, which needs the endpoint deployed. Requiring it would
 * block checkout on a value that only the webhook uses. The webhook route
 * demands it explicitly and refuses to run without it.
 */
const squareSchema = z.object({
  SQUARE_ACCESS_TOKEN: z.string().min(1),
  SQUARE_ENVIRONMENT: z.enum(["sandbox", "production"]),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().min(1).optional(),

  NEXT_PUBLIC_SQUARE_APPLICATION_ID: z.string().min(1),
  NEXT_PUBLIC_SQUARE_LOCATION_ID: z.string().min(1),

  /**
   * Not decoration: the webhook's HMAC is computed over
   * `notificationUrl + rawBody`, and `notificationUrl` is built from this. If it
   * does not match the URL registered in Square character for character, every
   * signature fails and the only symptom is a bare 401
   * (`docs/features/payments.md`).
   */
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
export type N8nEnv = z.infer<typeof n8nSchema>;
export type SquareEnv = z.infer<typeof squareSchema>;

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
 * n8n configuration, or `null` when it is missing or malformed.
 *
 * This is the ONE getter that does not throw, and the exception is deliberate.
 * A missing n8n variable must never return a 500 to a visitor who just filled
 * in the diagnosis: that loses the lead AND the person. The caller logs the
 * misconfiguration, reports `delivery: "failed"` and the UI offers the phone
 * number instead. Verifying this in production is a line of the deploy
 * checklist (`docs/04-deployment.md`), not a runtime crash.
 */
export function getN8nEnv(): N8nEnv | null {
  const parsed = n8nSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      `[env] n8n sin configurar — el CRM no recibirá datos:\n${formatIssues(parsed.error.issues)}`,
    );
    return null;
  }

  return parsed.data;
}

/**
 * Square configuration, or `null` when it is missing or malformed.
 *
 * Does not throw, same as `getN8nEnv` — but for a different reason, and the
 * difference matters at the call site:
 *
 * - In `/checkout`, a missing key means we cannot charge. The visitor gets a
 *   controlled message and the firm's phone number, not a 500 that loses them.
 * - In the webhook, `null` means we cannot VERIFY a payment that already
 *   happened. That must answer 5xx so Square keeps retrying for 72 h — never
 *   200, which would drop the notification on the floor.
 *
 * `NEXT_PUBLIC_*` values are listed one by one because Next.js inlines those
 * identifiers at build time; reading them off a `process.env` spread works on
 * the server today but breaks the moment this is imported from a bundle.
 */
export function getSquareEnv(): SquareEnv | null {
  const parsed = squareSchema.safeParse({
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT,
    SQUARE_WEBHOOK_SIGNATURE_KEY: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || undefined,
    NEXT_PUBLIC_SQUARE_APPLICATION_ID: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    NEXT_PUBLIC_SQUARE_LOCATION_ID: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    console.error(`[env] Square sin configurar:\n${formatIssues(parsed.error.issues)}`);
    return null;
  }

  return parsed.data;
}

/**
 * Secret that signs the client's appointment link (ADR-016 —
 * `docs/features/appointment-management.md`).
 *
 * Validated on its own and not inside `serverSchema` for the same reason Square
 * and n8n are: that schema demands Supabase, Google and Anthropic keys this
 * project does not have. Reading it to render an appointment page would throw
 * over values that page never touches.
 *
 * **This one THROWS when it is missing**, unlike `getN8nEnv()` and
 * `getSquareEnv()`. The exception those two make — "a 500 loses the lead and the
 * person" — does not apply: without the secret there is nothing to serve on that
 * page, and serving something would be worse. A link signed with no secret lets
 * anyone cancel anyone's appointment.
 *
 * 32 characters minimum, same floor as `N8N_WEBHOOK_TOKEN` doubled: this one
 * guards a cancel button, not a spreadsheet row.
 *
 * ⚠️ Rotating it invalidates EVERY link already sent by email, with no grace
 * period — there cannot be one without state. See the ADR before rotating.
 */
export function getAppointmentTokenSecret(): string {
  const secret = process.env.APPOINTMENT_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "APPOINTMENT_TOKEN_SECRET ausente o demasiado corto (mínimo 32 caracteres).\n" +
        "Genérala con `openssl rand -base64 32` y ponla en .env.local Y en Vercel.\n" +
        "See .env.example and docs/02-architecture.md",
    );
  }

  return secret;
}

/**
 * Google service-account keys are stored with escaped newlines in `.env`.
 * The Google SDK needs the real newlines back.
 */
export function normalizeGooglePrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}
