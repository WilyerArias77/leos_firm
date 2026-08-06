import "server-only";
import { getN8nEnv } from "@/lib/env";

/**
 * HTTP client for the n8n webhooks (ADR-010).
 *
 * n8n is the only thing that holds Google credentials: Next.js posts a payload
 * and n8n decides what to do with it (Sheets, Calendar, Gmail). This module
 * knows nothing about the business — that is what `src/services/` is for.
 *
 * `server-only` is the safety net: the shared token must never reach a bundle
 * that ships to the browser.
 */

/**
 * A hung n8n must not hold a visitor's request open. Eight seconds is well
 * above a normal Sheets append (~1 s) and well below anyone's patience.
 */
const REQUEST_TIMEOUT_MS = 8_000;

export type N8nWebhook =
  | "crm"
  | "availability"
  | "booking"
  | "confirm"
  | "payments"
  | "appointment"
  | "cancel"
  | "reschedule";

type N8nEnvValue = NonNullable<ReturnType<typeof getN8nEnv>>;

const WEBHOOK_URLS: Record<N8nWebhook, (env: N8nEnvValue) => string | undefined> = {
  crm: (env) => env.N8N_CRM_WEBHOOK_URL,
  availability: (env) => env.N8N_AVAILABILITY_WEBHOOK_URL,
  booking: (env) => env.N8N_BOOKING_WEBHOOK_URL,
  confirm: (env) => env.N8N_CONFIRM_WEBHOOK_URL,
  payments: (env) => env.N8N_PAYMENTS_WEBHOOK_URL,
  appointment: (env) => env.N8N_APPOINTMENT_WEBHOOK_URL,
  cancel: (env) => env.N8N_CANCEL_WEBHOOK_URL,
  reschedule: (env) => env.N8N_RESCHEDULE_WEBHOOK_URL,
};

/** Reads the configured URL for a webhook, or `undefined` when it is not set. */
function webhookUrl(webhook: N8nWebhook): string | undefined {
  const env = getN8nEnv();
  if (!env) return undefined;

  return WEBHOOK_URLS[webhook](env);
}

/**
 * Posts a payload to an n8n webhook. Returns whether n8n accepted it.
 *
 * Never throws: every caller is in the middle of a visitor-facing flow, and no
 * failure of ours may become a failure of theirs. The reason is logged; the
 * caller decides what to show.
 */
export async function postToN8n(webhook: N8nWebhook, payload: unknown): Promise<boolean> {
  const response = await callN8n(webhook, payload);

  return response !== null;
}

/**
 * Posts to a webhook and returns its parsed body.
 *
 * `postToN8n` only reports whether n8n accepted the payload, which is all the
 * CRM needs. Scheduling needs the ANSWER — the busy blocks, the `eventId` —
 * so this exists alongside it rather than replacing it.
 *
 * ⚠️ For the body to arrive, the n8n Webhook node must be set to respond
 * **"Using 'Respond to Webhook' Node"**. With the default it answers
 * `{"message":"Workflow got started"}` before touching Calendar, and the
 * caller would see a valid, empty response (`features/scheduling.md`).
 *
 * Returns `null` on any failure — never throws, same contract as `postToN8n`.
 */
export async function requestFromN8n<T>(webhook: N8nWebhook, payload: unknown): Promise<T | null> {
  const url = webhookUrl(webhook);

  // No URL configured: the workflow does not exist yet. Outside production we
  // answer with the mock so the feature can be built and clicked through; in
  // production we refuse, and the caller offers the firm's phone number.
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      console.error(`[n8n] webhook "${webhook}" sin configurar — no hay disponibilidad que dar`);
      return null;
    }

    const { mockN8nResponse } = await import("./mock");
    return mockN8nResponse(webhook, payload) as T;
  }

  const response = await callN8n(webhook, payload);
  if (!response) return null;

  try {
    return (await response.json()) as T;
  } catch {
    // A 200 with a body that is not JSON is the signature of a Webhook node
    // left on "Respond immediately".
    console.error(`[n8n] webhook "${webhook}" respondió algo que no es JSON`);
    return null;
  }
}

/**
 * The single place that actually speaks HTTP to n8n.
 *
 * Returns the `Response` when n8n accepted, `null` otherwise. Never throws:
 * every caller sits in the middle of a visitor-facing flow, and no failure of
 * ours may become a failure of theirs.
 */
async function callN8n(webhook: N8nWebhook, payload: unknown): Promise<Response | null> {
  const env = getN8nEnv();
  const url = env ? WEBHOOK_URLS[webhook](env) : undefined;

  if (!env || !url) return null;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Matches the Header Auth credential on the n8n Webhook node. The
        // unguessable webhook path is not considered authentication.
        "x-leosfirm-token": env.N8N_WEBHOOK_TOKEN,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[n8n] webhook "${webhook}" respondió ${response.status}`);
      return null;
    }

    return response;
  } catch (error) {
    // Timeout, DNS, TLS, n8n down. No PII here: only the webhook name.
    const reason = error instanceof Error ? error.name : "unknown";
    console.error(`[n8n] webhook "${webhook}" no respondió (${reason})`);
    return null;
  }
}
