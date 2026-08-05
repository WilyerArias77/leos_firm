import "server-only";
import { SquareClient, SquareEnvironment } from "square";
import { getSquareEnv } from "@/lib/env";

/**
 * Square SDK client — `docs/features/payments.md`.
 *
 * The one place that holds the access token. Nothing about the business lives
 * here: what to charge and when is `src/services/payment.service.ts`, same
 * split as `src/lib/n8n/client.ts` (Mandamiento II).
 *
 * `server-only` is the safety net. The token moves money; it must never end up
 * in a bundle that ships to the browser.
 */

let cached: SquareClient | null = null;

/**
 * Returns the client, or `null` when Square is not configured.
 *
 * Null instead of throwing so a missing variable becomes a controlled message
 * with the firm's phone number rather than a 500 in the middle of a payment.
 * The caller decides — see `getSquareEnv` for why the two call sites differ.
 */
export function getSquareClient(): SquareClient | null {
  if (cached) return cached;

  const env = getSquareEnv();
  if (!env) return null;

  cached = new SquareClient({
    token: env.SQUARE_ACCESS_TOKEN,
    environment:
      env.SQUARE_ENVIRONMENT === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    // Square's own retries are fine for reads, but a payment must not be sent
    // twice by the transport layer. Idempotency covers us either way, and one
    // retry keeps a blip from becoming a declined checkout.
    maxRetries: 1,
  });

  return cached;
}

/**
 * Square returns monetary amounts as `bigint`.
 *
 * `JSON.stringify` THROWS on a bigint — so an amount that reaches the n8n
 * payload untouched takes down the confirmation, after the money was already
 * charged. Every amount leaving this module goes through here.
 */
export function centsToNumber(amount: bigint | number | null | undefined): number {
  if (amount === null || amount === undefined) return 0;

  return typeof amount === "bigint" ? Number(amount) : amount;
}

/** Cents to the plain decimal string the CRM sheet stores (`"150.00"`). */
export function centsToUsdString(amount: bigint | number | null | undefined): string {
  return (centsToNumber(amount) / 100).toFixed(2);
}
