import { NextResponse } from "next/server";
import {
  AVAILABILITY_RATE_LIMIT,
  BUSINESS_TIMEZONE,
  INITIAL_CONSULTATION,
  SCHEDULING,
} from "@/constants/business";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { daysBetween, resolveTimeZone, shiftCalendarDay } from "@/lib/utils/timezone";
import { availabilityQuerySchema } from "@/lib/validation/appointment.schema";
import { buildAvailability, findNextAvailableDay } from "@/services/availability.service";
import { fetchBusyBlocks } from "@/services/scheduling.service";
import { getServiceBySlug } from "@/services/service.service";
import { toFieldErrors } from "@/lib/validation/lead.schema";
import type { AvailabilityResult } from "@/types/scheduling.types";

/**
 * GET /api/v1/availability — public, rate limited.
 * Documented in `docs/API_DOCS.md` · feature: `features/scheduling.md`.
 *
 * Asks n8n for Claudia's busy blocks and crosses them with `BUSINESS_HOURS`
 * (ADR-010): n8n has the credentials, this has the business rules.
 */

/**
 * Never cached, and that is a hard requirement, not a default.
 *
 * Claudia also books by hand and through other channels (ADR-003), so a slot
 * computed 30 seconds ago may already be sold. A cached response here means
 * offering hours that are gone.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(
    `availability:${ip}`,
    AVAILABILITY_RATE_LIMIT.maxRequests,
    AVAILABILITY_RATE_LIMIT.windowMs,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Demasiadas consultas desde este dispositivo. Inténtalo en un momento.",
      },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    tz: searchParams.get("tz") ?? undefined,
    servicio: searchParams.get("servicio") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "No pudimos leer el rango de fechas solicitado.",
        details: toFieldErrors(parsed.error),
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const { from, tz, servicio } = parsed.data;

  // Clamped instead of rejected: a range too wide is a UI bug, not something
  // the visitor did, and n8n only has 8 seconds to read the calendar.
  const requestedSpan = daysBetween(from, parsed.data.to);
  const to =
    requestedSpan > SCHEDULING.maxRangeDays
      ? shiftCalendarDay(from, SCHEDULING.maxRangeDays)
      : parsed.data.to;

  if (requestedSpan < 0) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "El rango de fechas está invertido." },
      { status: 400, headers: NO_STORE },
    );
  }

  const clientTimezone = resolveTimeZone(tz);
  const service = servicio ? await getServiceBySlug(servicio) : null;
  const durationMinutes = service?.durationMinutes ?? INITIAL_CONSULTATION.durationMinutes;

  // One day of slack on each side: a visitor far enough east or west sees
  // slots that belong to the firm's previous or next day.
  const busy = await fetchBusyBlocks({
    timeMin: `${shiftCalendarDay(from, -1)}T00:00:00.000Z`,
    timeMax: `${shiftCalendarDay(to, 2)}T00:00:00.000Z`,
  });

  // `null` is "we could not ask", never "nothing is busy". Showing a wide-open
  // calendar built on no information would sell hours that are already taken.
  if (busy === null) {
    return NextResponse.json(
      {
        error: "UPSTREAM_ERROR",
        message:
          "No pudimos consultar la agenda en este momento. Vuelve a intentarlo o llámanos y te agendamos por teléfono.",
      },
      { status: 502, headers: NO_STORE },
    );
  }

  const days = buildAvailability({
    from,
    to,
    busy,
    now: new Date(),
    durationMinutes,
    clientTimeZone: clientTimezone,
  });

  const data: AvailabilityResult = {
    clientTimezone,
    businessTimezone: BUSINESS_TIMEZONE,
    days,
    nextAvailableFrom: findNextAvailableDay(days),
  };

  return NextResponse.json(
    { data, message: "Disponibilidad consultada" },
    { status: 200, headers: NO_STORE },
  );
}
