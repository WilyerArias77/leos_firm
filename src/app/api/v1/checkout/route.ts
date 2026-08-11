import { NextResponse } from "next/server";
import { CHECKOUT_RATE_LIMIT, COMPANY } from "@/constants/business";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { checkoutSchema } from "@/lib/validation/checkout.schema";
import { toFieldErrors } from "@/lib/validation/lead.schema";
import { chargeForAppointment } from "@/services/payment.service";
import { getServiceBySlug } from "@/services/service.service";
import type { CheckoutResult } from "@/types/payment.types";

/**
 * POST /api/v1/checkout — public, rate limited.
 * Documented in `docs/API_DOCS.md` § Checkout · feature: `features/payments.md`.
 *
 * Charges the card for a slot that is ALREADY held (ADR-011). It does not
 * confirm anything: the appointment becomes real when Square's webhook says the
 * money cleared (ADR-002). A `201` from here means "the charge was accepted",
 * and the response says `pending` for exactly that reason.
 *
 * The amount is read from the catalog by `serviceSlug` (ADR-006) — the body has
 * no field for it, so there is nothing to ignore.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** Same fallback as the rest of the funnel: our failure, their phone call. */
const UPSTREAM_MESSAGE =
  `No pudimos procesar el pago en este momento. Tu horario sigue apartado — ` +
  `escríbenos a ${COMPANY.email} y lo completamos contigo.`;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(
    `checkout:${ip}`,
    CHECKOUT_RATE_LIMIT.maxRequests,
    CHECKOUT_RATE_LIMIT.windowMs,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Recibimos varios intentos desde este dispositivo. Inténtalo más tarde.",
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

  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Revisa los datos del pago.",
        details: toFieldErrors(parsed.error),
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const checkout = parsed.data;

  // Price, name and duration come from the catalog on the server. The client
  // only ever sends a slug (ADR-006).
  const service = await getServiceBySlug(checkout.serviceSlug);

  if (!service) {
    return NextResponse.json(
      { error: "SERVICE_NOT_FOUND", message: "No encontramos el servicio seleccionado." },
      { status: 404, headers: NO_STORE },
    );
  }

  const charge = await chargeForAppointment({
    leadId: checkout.leadId,
    eventId: checkout.eventId,
    service,
    sourceId: checkout.sourceId,
    verificationToken: checkout.verificationToken,
  });

  if (!charge.ok) {
    // A refused card is the visitor's to fix and says so; anything else is ours
    // and gets the phone number. The slot stays held either way.
    if (charge.reason === "declined") {
      return NextResponse.json(
        { error: "PAYMENT_DECLINED", message: charge.message },
        { status: 402, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      { error: "UPSTREAM_ERROR", message: UPSTREAM_MESSAGE },
      { status: 502, headers: NO_STORE },
    );
  }

  const data: CheckoutResult = {
    orderId: charge.orderId,
    paymentId: charge.paymentId,
    status: charge.status,
  };

  return NextResponse.json(
    { data, message: "Pago en proceso" },
    { status: 201, headers: NO_STORE },
  );
}
