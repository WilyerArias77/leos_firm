import { NextResponse } from "next/server";
import { APPOINTMENT_ACCESS_RATE_LIMIT, COMPANY } from "@/constants/business";
import { readAppointmentToken } from "@/lib/utils/appointmentToken";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { cancelAppointment, fetchAppointment } from "@/services/appointment-management.service";

/**
 * POST /api/v1/appointments/[token]/cancel — authenticated by the signed token.
 * Documented in `docs/API_DOCS.md` · feature: `features/appointment-management.md`.
 *
 * Cancels the client's own appointment: frees the slot in Calendar, moves the
 * CRM row to `cancelado` and emails both Claudia and the client. All three are
 * done by the n8n workflow, which is the only thing holding Google credentials
 * (ADR-010).
 *
 * **No refund happens here and none can.** `docs/03-security.md` is explicit
 * that refunds never run from a public endpoint; Claudia issues them from her
 * Square dashboard. What this endpoint owes her is the one fact that decides it:
 * whether the cancellation landed above or below the 24 h line of
 * `context.md` §8 — computed here, on the server, in UTC.
 *
 * The token is verified again even though the page just did: the page's verdict
 * is not evidence that this request came from the page.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/**
 * Our failure, their phone call. It says the appointment is still on because it
 * is: leaving someone believing they cancelled when they did not is the one
 * thing this endpoint must never do.
 */
const UPSTREAM_MESSAGE =
  `No pudimos cancelar tu cita en este momento, así que sigue en pie. ` +
  `Escríbenos a ${COMPANY.email} y la cancelamos contigo.`;

export async function POST(
  request: Request,
  props: RouteContext<"/api/v1/appointments/[token]/cancel">,
) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(
    `appointment-cancel:${ip}`,
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

  // A bad signature and an unknown appointment answer identically, on purpose:
  // telling them apart would let someone probe which tokens are valid.
  if (!eventId) return notFound();

  const lookup = await fetchAppointment(eventId);

  if (!lookup.ok) {
    if (lookup.reason === "not-found") return notFound();

    return NextResponse.json(
      { error: "UPSTREAM_ERROR", message: UPSTREAM_MESSAGE },
      { status: 502, headers: NO_STORE },
    );
  }

  const outcome = await cancelAppointment(lookup.appointment, new Date());

  if (!outcome.ok) {
    if (outcome.reason === "past") {
      return NextResponse.json(
        {
          error: "APPOINTMENT_PAST",
          message:
            "Esa consulta ya empezó, así que no se puede cancelar desde aquí. " +
            `Si necesitas hablar de tu caso, escríbenos a ${COMPANY.email}.`,
        },
        { status: 409, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      { error: "UPSTREAM_ERROR", message: UPSTREAM_MESSAGE },
      { status: 502, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    {
      data: { cancelled: true, alreadyCancelled: outcome.alreadyCancelled },
      message: "Cita cancelada",
    },
    { status: 200, headers: NO_STORE },
  );
}

function notFound(): NextResponse {
  return NextResponse.json(
    { error: "NOT_FOUND", message: "No encontramos esa cita." },
    { status: 404, headers: NO_STORE },
  );
}
