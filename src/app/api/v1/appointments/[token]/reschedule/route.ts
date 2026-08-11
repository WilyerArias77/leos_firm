import { NextResponse } from "next/server";
import {
  APPOINTMENT_ACCESS_RATE_LIMIT,
  BUSINESS_TIMEZONE,
  CANCELLATION_POLICY,
  COMPANY,
} from "@/constants/business";
import { readAppointmentToken } from "@/lib/utils/appointmentToken";
import { calendarDayOf, shiftCalendarDay } from "@/lib/utils/timezone";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { rescheduleMoveSchema } from "@/lib/validation/appointment-management.schema";
import { toFieldErrors } from "@/lib/validation/lead.schema";
import { buildAvailability, isSlotBookable } from "@/services/availability.service";
import { fetchAppointment, moveAppointment } from "@/services/appointment-management.service";
import { fetchBusyBlocks } from "@/services/scheduling.service";

/**
 * POST /api/v1/appointments/[token]/reschedule — signed token (ADR-019).
 * Documented in `docs/API_DOCS.md` · feature: `features/appointment-management.md`.
 *
 * **This one moves the appointment for real**, unlike its neighbour
 * `reschedule-request`, which only emails Claudia. The two coexist on purpose:
 * this is the ≥24 h self-service path, that one is what remains under 24 h,
 * where §8 says the change is no longer free and a person has to decide.
 *
 * No charge happens here, and none can: there is no Square call on this path at
 * all. It is the same appointment at another hour.
 *
 * The order of the checks is the design. Cheap and local first — rate limit,
 * signature, shape — then the two that cost a network call, and only then the
 * move. Availability is re-read from Google immediately before the workflow is
 * asked to patch, because what the browser drew is a suggestion and the
 * calendar is the source of truth (ADR-003).
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const MINUTE_MS = 60_000;

const UPSTREAM_MESSAGE =
  `No pudimos mover tu cita en este momento. Tu cita sigue en pie a la hora de siempre. ` +
  `Escríbenos a ${COMPANY.email} y lo resolvemos contigo.`;

export async function POST(
  request: Request,
  props: RouteContext<"/api/v1/appointments/[token]/reschedule">,
) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(
    `appointment-move:${ip}`,
    APPOINTMENT_ACCESS_RATE_LIMIT.maxRequests,
    APPOINTMENT_ACCESS_RATE_LIMIT.windowMs,
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

  // Next 16: route params are async.
  const { token } = await props.params;

  const eventId = readAppointmentToken(token);
  if (!eventId) return notFound();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "No pudimos leer los datos enviados." },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = rescheduleMoveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Elige un horario de la lista antes de continuar.",
        details: toFieldErrors(parsed.error),
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const lookup = await fetchAppointment(eventId);

  if (!lookup.ok) {
    if (lookup.reason === "not-found") return notFound();

    return NextResponse.json(
      { error: "UPSTREAM_ERROR", message: UPSTREAM_MESSAGE },
      { status: 502, headers: NO_STORE },
    );
  }

  const appointment = lookup.appointment;
  const newStartUtc = parsed.data.newStartUtc;

  /**
   * The appointment keeps the length it was sold with, taken from the event
   * itself rather than from today's catalog.
   *
   * Sessions went from 60 to 30 minutes on 2026-08-07. Reading the catalog here
   * would silently shorten an older appointment as a side effect of moving it —
   * the client booked an hour and would get half without ever being told.
   */
  const durationMinutes = Math.round(
    (Date.parse(appointment.endUtc) - Date.parse(appointment.startUtc)) / MINUTE_MS,
  );

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    console.error("[cita] la cita no tiene una duración utilizable", { eventId });

    return NextResponse.json(
      { error: "UPSTREAM_ERROR", message: UPSTREAM_MESSAGE },
      { status: 502, headers: NO_STORE },
    );
  }

  const newStart = new Date(newStartUtc);
  const businessDay = calendarDayOf(newStart, BUSINESS_TIMEZONE);

  const busy = await fetchBusyBlocks({
    timeMin: `${shiftCalendarDay(businessDay, -1)}T00:00:00.000Z`,
    timeMax: `${shiftCalendarDay(businessDay, 2)}T00:00:00.000Z`,
  });

  if (busy === null) {
    return NextResponse.json(
      { error: "UPSTREAM_ERROR", message: UPSTREAM_MESSAGE },
      { status: 502, headers: NO_STORE },
    );
  }

  const now = new Date();

  /**
   * The client's OWN event is inside `busy`, so their current hour reads as
   * taken and `isSlotBookable` rejects it. That is the right answer for the
   * wrong reason, and `moveAppointment` catches it first with a message that
   * says what actually happened — "that is the hour you already have".
   */
  const free = isSlotBookable({ startUtc: newStartUtc, busy, now, durationMinutes });

  if (!free && Date.parse(newStartUtc) !== Date.parse(appointment.startUtc)) {
    const alternatives = buildAvailability({
      from: businessDay,
      to: businessDay,
      busy,
      now,
      durationMinutes,
      clientTimeZone: appointment.clientTimezone,
    });

    return NextResponse.json(
      {
        error: "SLOT_TAKEN",
        message: "Ese horario se ocupó mientras elegías. Estos siguen libres ese día.",
        data: { alternatives },
      },
      { status: 409, headers: NO_STORE },
    );
  }

  const outcome = await moveAppointment({
    appointment,
    newStartUtc,
    newEndUtc: new Date(newStart.getTime() + durationMinutes * MINUTE_MS).toISOString(),
    now,
  });

  if (!outcome.ok) {
    return failure(outcome.reason, outcome.reason === "limit" ? outcome.limit : undefined);
  }

  return NextResponse.json(
    {
      data: {
        movedTo: newStartUtc,
        meetingUrl: outcome.meetingUrl,
        rescheduleCount: outcome.rescheduleCount,
      },
      message: "Cita reprogramada",
    },
    { status: 200, headers: NO_STORE },
  );
}

/**
 * Every refusal names the way out, and the way out is never a dead end: below
 * 24 h and past the limit both still have the email path, which is the whole
 * reason `reschedule-request` was not deleted when this was built.
 */
function failure(
  reason: "too-late" | "limit" | "taken" | "same-slot" | "upstream",
  limit?: number,
): NextResponse {
  if (reason === "too-late") {
    return NextResponse.json(
      {
        error: "TOO_LATE",
        message:
          `Faltan menos de ${CANCELLATION_POLICY.freeChangeWindowHours} horas para tu consulta, ` +
          "así que ya no puedes moverla tú. Pídele otro horario a Claudia desde el botón de abajo.",
      },
      { status: 409, headers: NO_STORE },
    );
  }

  if (reason === "limit") {
    return NextResponse.json(
      {
        error: "RESCHEDULE_LIMIT",
        message:
          `Ya cambiaste esta cita ${limit ?? CANCELLATION_POLICY.maxSelfReschedules} veces, ` +
          "que es el máximo. Pídele otro horario a Claudia desde el botón de abajo.",
      },
      { status: 409, headers: NO_STORE },
    );
  }

  if (reason === "taken") {
    return NextResponse.json(
      {
        error: "SLOT_TAKEN",
        message: "Ese horario se ocupó justo antes de confirmar. Elige otro y tu cita no se movió.",
      },
      { status: 409, headers: NO_STORE },
    );
  }

  if (reason === "same-slot") {
    return NextResponse.json(
      {
        error: "SAME_SLOT",
        message: "Ese es el horario que ya tienes. Elige uno distinto.",
      },
      { status: 409, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    { error: "UPSTREAM_ERROR", message: UPSTREAM_MESSAGE },
    { status: 502, headers: NO_STORE },
  );
}

function notFound(): NextResponse {
  return NextResponse.json(
    { error: "NOT_FOUND", message: "No encontramos esa cita." },
    { status: 404, headers: NO_STORE },
  );
}
