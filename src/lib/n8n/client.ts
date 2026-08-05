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

export type N8nWebhook = "crm";

const WEBHOOK_URLS: Record<N8nWebhook, (env: NonNullable<ReturnType<typeof getN8nEnv>>) => string> =
  {
    crm: (env) => env.N8N_CRM_WEBHOOK_URL,
  };

/**
 * Posts a payload to an n8n webhook. Returns whether n8n accepted it.
 *
 * Never throws: every caller is in the middle of a visitor-facing flow, and no
 * failure of ours may become a failure of theirs. The reason is logged; the
 * caller decides what to show.
 */
export async function postToN8n(webhook: N8nWebhook, payload: unknown): Promise<boolean> {
  const env = getN8nEnv();
  if (!env) return false;

  try {
    const response = await fetch(WEBHOOK_URLS[webhook](env), {
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
      return false;
    }

    return true;
  } catch (error) {
    // Timeout, DNS, TLS, n8n down. No PII here: only the webhook name.
    const reason = error instanceof Error ? error.name : "unknown";
    console.error(`[n8n] webhook "${webhook}" no respondió (${reason})`);
    return false;
  }
}
