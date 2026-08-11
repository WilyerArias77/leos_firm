import { NextResponse } from "next/server";
import { APPOINTMENT_ACCESS_RATE_LIMIT, COMPANY } from "@/constants/business";
import { readAppointmentToken } from "@/lib/utils/appointmentToken";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { rescheduleRequestSchema } from "@/lib/validation/appointment-management.schema";
import { toFieldErrors } from "@/lib/validation/lead.schema";
import { fetchAppointment, requestReschedule } from "@/services/appointment-management.service";

/**
 * POST /api/v1/appointments/[token]/reschedule-request — signed token.
 * Documented in `docs/API_DOCS.md` · feature: `features/appointment-management.md`.
 *
 * **It does not reschedule anything.** It emails Claudia the time the client
 * would prefer and she agrees it with them directly. Nothing moves in Calendar
 * and no CRM stage changes, because until she answers, the original appointment
 * still stands.
 *
 * That is why it answers `202 Accepted` and not `200`: the request was taken,
 * the rescheduling did not happen. The screen says the same thing in words —
 * "Claudia te va a escribir", never "tu cita fue reprogramada".
 *
 * Rescheduling for real means revalidating a slot, moving the event, keeping the
 * Meet link and not charging again. An email covers the actual case for a
 * fraction of that surface (FASE 9, alcance recortado).
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const UPSTREAM_MESSAGE =
  `No pudimos enviar tu solicitud en este momento. ` +
  `Escríbenos a ${COMPANY.email} y lo acordamos contigo.`;

export async function POST(
  request: Request,
  props: RouteContext<"/api/v1/appointments/[token]/reschedule-request">,
) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(
    `appointment-reschedule:${ip}`,
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

  const parsed = rescheduleRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Revisa lo que escribiste antes de enviarlo.",
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

  const outcome = await requestReschedule(
    lookup.appointment,
    parsed.data.preference,
    new Date(),
  );

  if (!outcome.ok) {
    if (outcome.reason === "past") {
      return NextResponse.json(
        {
          error: "APPOINTMENT_PAST",
          message:
            "Esa consulta ya empezó, así que no se puede mover desde aquí. " +
            `Escríbenos a ${COMPANY.email} y vemos cómo seguir.`,
        },
        { status: 409, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      { error: "UPSTREAM_ERROR", message: UPSTREAM_MESSAGE },
      { status: 502, headers: NO_STORE },
    );
  }

  // 202, not 201 and not 200: nothing was created and nothing changed. Someone
  // received a message and will answer it.
  return NextResponse.json(
    { data: { received: true }, message: "Solicitud enviada" },
    { status: 202, headers: NO_STORE },
  );
}

function notFound(): NextResponse {
  return NextResponse.json(
    { error: "NOT_FOUND", message: "No encontramos esa cita." },
    { status: 404, headers: NO_STORE },
  );
}
