import { NextResponse } from "next/server";
import { APPOINTMENT_RATE_LIMIT } from "@/constants/business";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { releaseSlot } from "@/services/scheduling.service";

/**
 * POST /api/v1/appointments/release — public, rate limited.
 * Documented in `docs/API_DOCS.md` · feature: `features/scheduling.md`.
 *
 * Frees an unpaid hold the moment the visitor walks away, instead of waiting
 * for the cleaner (client request, 2026-08-07).
 *
 * **It always answers 200.** Releasing is an optimisation, never a guarantee:
 * the slot disappears on its own after `SLOT_HOLD_MINUTES` whatever happens
 * here. The caller is a visitor who is already leaving — often a
 * `sendBeacon` on unload that nobody will ever read the answer of — so an error
 * status would only produce noise in someone's console on the way out.
 *
 * **A declined card must not call this.** The trigger is the visitor LEAVING;
 * a decline keeps the hold so they can retry (`features/scheduling.md`
 * § Liberar el hueco).
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/**
 * Google Calendar event ids are lowercase base32hex, 5–1024 chars. Checking the
 * shape here keeps obvious junk from ever reaching n8n; it is NOT the security
 * boundary — that is the workflow, which refuses to delete anything that is not
 * an unpaid tentative hold.
 */
const EVENT_ID_PATTERN = /^[a-z0-9_@.-]{5,1024}$/i;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(
    `release:${ip}`,
    APPOINTMENT_RATE_LIMIT.maxRequests,
    APPOINTMENT_RATE_LIMIT.windowMs,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { released: false, reason: "RATE_LIMITED" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { released: false, reason: "INVALID_BODY" },
      { status: 200, headers: NO_STORE },
    );
  }

  const eventId =
    body && typeof body === "object" && "eventId" in body
      ? (body as { eventId: unknown }).eventId
      : undefined;

  if (typeof eventId !== "string" || !EVENT_ID_PATTERN.test(eventId)) {
    return NextResponse.json(
      { released: false, reason: "INVALID_EVENT_ID" },
      { status: 200, headers: NO_STORE },
    );
  }

  const released = await releaseSlot(eventId);

  return NextResponse.json({ released }, { status: 200, headers: NO_STORE });
}
