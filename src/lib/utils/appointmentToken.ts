import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppointmentTokenSecret } from "@/lib/env";

/**
 * The client's link to their own appointment (ADR-016 —
 * `docs/features/appointment-management.md`).
 *
 * ADR-001 said this would be a random UUID stored next to the appointment. That
 * assumed a database column to compare against, and Supabase is frozen
 * (ADR-010): the CRM is a spreadsheet, so there is nowhere to write a token and
 * nowhere to look it up. A random UUID needs a place where it is written down in
 * order to mean anything — without it, it is just a string.
 *
 * So the token is SIGNED instead of stored:
 *
 * ```
 * token = base64url(eventId) + "." + base64url(HMAC-SHA256(eventId, secret))
 * ```
 *
 * Verifying is recomputing the digest and comparing it in constant time, the
 * same way `src/lib/square/signature.ts` verifies Square's webhook. No state, no
 * database, and no network call to find out whether a link is legitimate.
 *
 * **Nothing but the event id travels inside.** It is Google's opaque identifier
 * and it names nobody: the name, the email and the service are read off the
 * event itself, after the signature checks out and only then.
 */

/** Separates the payload from its digest. Not valid base64url, so unambiguous. */
const SEPARATOR = ".";

function sign(eventId: string, secret: string): string {
  return createHmac("sha256", secret).update(eventId, "utf8").digest("base64url");
}

/**
 * Builds the token that goes in the confirmation email.
 *
 * Throws when `APPOINTMENT_TOKEN_SECRET` is missing, and that is the right
 * behaviour here: a link signed with no secret is a link that lets anyone cancel
 * anyone's appointment. The caller is the payment webhook's background work, so
 * the throw never reaches a visitor.
 */
export function createAppointmentToken(eventId: string): string {
  const secret = getAppointmentTokenSecret();

  return `${Buffer.from(eventId, "utf8").toString("base64url")}${SEPARATOR}${sign(eventId, secret)}`;
}

/**
 * The event id inside a token, or `null` when the signature does not check out.
 *
 * `null` covers every rejection — malformed, tampered with, signed by another
 * secret — because the caller must not be able to tell them apart either. The
 * page turns all of them into `notFound()`, so nobody can use the response as an
 * oracle for which tokens are cryptographically valid.
 */
export function readAppointmentToken(token: string): string | null {
  const parts = token.split(SEPARATOR);
  if (parts.length !== 2) return null;

  const [encodedEventId, signature] = parts;
  if (!encodedEventId || !signature) return null;

  const eventId = Buffer.from(encodedEventId, "base64url").toString("utf8");

  // A round trip that changes the string means the input was not the canonical
  // base64url of anything: `Buffer.from` silently ignores stray characters, so
  // without this check several spellings of one token would all verify.
  if (Buffer.from(eventId, "utf8").toString("base64url") !== encodedEventId) return null;
  if (eventId.length === 0) return null;

  const expected = Buffer.from(sign(eventId, getAppointmentTokenSecret()), "utf8");
  const received = Buffer.from(signature, "utf8");

  // `timingSafeEqual` THROWS on differing lengths, so the guard is required. It
  // leaks only the length of a fixed-size digest, which is public.
  if (expected.length !== received.length) return null;
  if (!timingSafeEqual(expected, received)) return null;

  return eventId;
}
