import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Square webhook signature verification — `docs/03-security.md` § Pagos.
 *
 * The webhook is the ONLY source of truth for a payment (ADR-002), so this
 * function is what stands between an attacker and a confirmed appointment
 * nobody paid for. It is deliberately written against `node:crypto` rather
 * than the SDK's `WebhooksHelper`: the project rule is a constant-time
 * comparison we can read, and a dependency that changes its mind about
 * returning a promise must not silently turn into a truthy value.
 */

/** Header Square signs every notification with. */
export const SQUARE_SIGNATURE_HEADER = "x-square-hmacsha256-signature";

/**
 * The URL Square has registered for the subscription, built from the site URL.
 *
 * It is part of the signed payload, so it must match what was typed into the
 * Square dashboard character for character — including the absence of a
 * trailing slash. **Never derive this from `request.url`**: behind a proxy the
 * host or scheme can differ from the public one and the signature never checks
 * out, with a bare 401 as the only symptom.
 */
export function squareNotificationUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/api/v1/webhooks/square`;
}

/**
 * Verifies `x-square-hmacsha256-signature` over `notificationUrl + rawBody`.
 *
 * `rawBody` must be the untouched string from `await request.text()`. Parsing
 * and re-serialising changes key order and whitespace, and the digest no
 * longer matches.
 */
export function verifySquareSignature({
  rawBody,
  signature,
  signatureKey,
  notificationUrl,
}: {
  rawBody: string;
  signature: string | null;
  signatureKey: string;
  notificationUrl: string;
}): boolean {
  if (!signature) return false;

  const expected = createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody, "utf8")
    .digest("base64");

  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(signature, "utf8");

  // `timingSafeEqual` THROWS on differing lengths, so the guard is required.
  // It leaks only the length of a fixed-size base64 digest, which is public.
  if (expectedBytes.length !== receivedBytes.length) return false;

  return timingSafeEqual(expectedBytes, receivedBytes);
}
