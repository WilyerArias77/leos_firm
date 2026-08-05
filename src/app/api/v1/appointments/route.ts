import { NextResponse } from "next/server";
import { APPOINTMENT_RATE_LIMIT, BUSINESS_TIMEZONE } from "@/constants/business";
import { calendarDayOf, shiftCalendarDay, toUtcIso } from "@/lib/utils/timezone";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { appointmentSchema, normalizeAppointment } from "@/lib/validation/appointment.schema";
import { toFieldErrors } from "@/lib/validation/lead.schema";
import { buildAvailability, isSlotBookable } from "@/services/availability.service";
import { syncAppointmentToCrm } from "@/services/crm.service";
import { fetchBusyBlocks, holdSlot } from "@/services/scheduling.service";
import { getServiceBySlug } from "@/services/service.service";
import type { AppointmentHold } from "@/types/scheduling.types";

/**
 * POST /api/v1/appointments — public, rate limited.
 * Documented in `docs/API_DOCS.md` · feature: `features/scheduling.md`.
 *
 * Holds the slot as a TENTATIVE event in Claudia's calendar (ADR-011) and
 * advances the CRM row to `agenda`. This is not a confirmed appointment: no
 * appointment exists until Square confirms the payment (`context.md` §8).
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(
    `appointments:${ip}`,
    APPOINTMENT_RATE_LIMIT.maxRequests,
    APPOINTMENT_RATE_LIMIT.windowMs,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Recibimos varias solicitudes desde este dispositivo. Inténtalo más tarde.",
      },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "No pudimos leer los datos enviados." },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = appointmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Revisa los datos antes de confirmar.",
        details: toFieldErrors(parsed.error),
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const appointment = normalizeAppointment(parsed.data);

  // Name, duration and price come from the catalog, never from the request
  // (ADR-006). The client only ever sends a slug.
  const service = await getServiceBySlug(appointment.serviceSlug);

  if (!service) {
    return NextResponse.json(
      { error: "SERVICE_NOT_FOUND", message: "No encontramos el servicio seleccionado." },
      { status: 404, headers: NO_STORE },
    );
  }

  const start = new Date(appointment.startUtc);
  const businessDay = calendarDayOf(start, BUSINESS_TIMEZONE);

  // Fresh busy blocks, asked for again right now. The browser's idea of what
  // is free is a suggestion; the calendar is the source of truth (ADR-003).
  const busy = await fetchBusyBlocks({
    timeMin: `${shiftCalendarDay(businessDay, -1)}T00:00:00.000Z`,
    timeMax: `${shiftCalendarDay(businessDay, 2)}T00:00:00.000Z`,
  });

  if (busy === null) {
    return NextResponse.json(
      {
        error: "UPSTREAM_ERROR",
        message:
          "No pudimos confirmar la disponibilidad en este momento. Llámanos y te agendamos por teléfono.",
      },
      { status: 502, headers: NO_STORE },
    );
  }

  const now = new Date();
  const stillFree = isSlotBookable({
    startUtc: appointment.startUtc,
    busy,
    now,
    durationMinutes: service.durationMinutes,
  });

  if (!stillFree) {
    // Someone took it while this visitor was filling in the form. Handing back
    // the alternatives turns a dead end into one more click.
    const alternatives = buildAvailability({
      from: calendarDayOf(start, appointment.clientTimezone),
      to: calendarDayOf(start, appointment.clientTimezone),
      busy,
      now,
      durationMinutes: service.durationMinutes,
      clientTimeZone: appointment.clientTimezone,
    });

    return NextResponse.json(
      {
        error: "SLOT_TAKEN",
        message: "Ese horario acaba de ocuparse. Elige otro, por favor.",
        data: { alternatives: alternatives.flatMap((day) => day.slots) },
      },
      { status: 409, headers: NO_STORE },
    );
  }

  const endUtc = toUtcIso(new Date(start.getTime() + service.durationMinutes * 60_000));

  const eventId = await holdSlot({
    leadId: appointment.leadId,
    fullName: appointment.fullName,
    email: appointment.email,
    phone: appointment.phone,
    serviceName: service.name,
    serviceSlug: service.slug,
    startUtc: appointment.startUtc,
    endUtc,
    clientTimezone: appointment.clientTimezone,
  });

  // Nothing was held, so there is nothing to undo. Failing here is the safe
  // side of the trade: no visitor is told they have a slot we cannot name.
  if (!eventId) {
    return NextResponse.json(
      {
        error: "UPSTREAM_ERROR",
        message:
          "No pudimos apartar ese horario. Vuelve a intentarlo o llámanos y lo agendamos contigo.",
      },
      { status: 502, headers: NO_STORE },
    );
  }

  // The slot IS held by now. A CRM outage must not undo a real booking, so
  // this reports its failure instead of throwing — same rule as `/leads`.
  const crmDelivery = await syncAppointmentToCrm({
    leadId: appointment.leadId,
    fullName: appointment.fullName,
    email: appointment.email,
    phone: appointment.phone,
    startUtc: appointment.startUtc,
    clientTimezone: appointment.clientTimezone,
    policyAcceptedIp: ip,
  });

  if (crmDelivery === "failed") {
    // Loud: the appointment exists in Calendar but the CRM row does not say
    // so. Recovery is manual, and no PII goes in the log (`03-security.md`).
    console.error("[agenda] NO LLEGÓ AL CRM", {
      leadId: appointment.leadId,
      service: service.slug,
      eventId,
    });
  }

  const data: AppointmentHold = {
    eventId,
    startUtc: appointment.startUtc,
    endUtc,
    clientTimezone: appointment.clientTimezone,
    businessTimezone: BUSINESS_TIMEZONE,
    crmDelivery,
  };

  return NextResponse.json(
    { data, message: "Horario apartado" },
    { status: 201, headers: NO_STORE },
  );
}
