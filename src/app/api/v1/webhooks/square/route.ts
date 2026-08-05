import { headers } from "next/headers";
import { NextResponse, after } from "next/server";
import { getSquareEnv } from "@/lib/env";
import { centsToUsdString } from "@/lib/square/client";
import {
  SQUARE_SIGNATURE_HEADER,
  squareNotificationUrl,
  verifySquareSignature,
} from "@/lib/square/signature";
import { squareWebhookSchema } from "@/lib/validation/square-webhook.schema";
import { syncPaymentToCrm } from "@/services/crm.service";
import {
  claimPaymentRow,
  confirmAppointment,
  readOrderContext,
  readPayment,
  settlePaymentRow,
} from "@/services/payment.service";
import { getServiceBySlug } from "@/services/service.service";
import type { ConfirmedPayment, OrderContext } from "@/types/payment.types";

/**
 * POST /api/v1/webhooks/square — authenticated by HMAC signature.
 * Documented in `docs/API_DOCS.md` · feature: `features/payments.md`.
 *
 * **The only place in this codebase that may declare a payment real** (ADR-002).
 * The browser can be closed mid-payment and the appointment still gets
 * confirmed, because nothing in this path depends on it.
 *
 * The order of operations is not negotiable (`payments.md` § La secuencia
 * entera):
 *
 * ```
 * 1. raw body        — parsing first invalidates the signature
 * 2. verify HMAC     — invalid → 401 and NOTHING else
 * 3. filter          — not a COMPLETED payment → 200, no work
 * 4. claim payment   — already in `Pagos` → 200, no work
 * 5. answer 200      — before the slow part, or Square retries over our own work
 * 6. after()         — re-read Square, confirm the event, write the CRM
 * ```
 *
 * What step 5 costs, stated plainly: after the `200`, Square never retries. If
 * step 6 fails, nobody will retry for us — which is why the `Pagos` row stays
 * in `recibido` and why that tab is in the sheet Claudia opens. A loud failure
 * where a person looks beats a silent retry that confirms twice.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/**
 * Nothing to do, and that is a success. Square must not retry a non-event.
 *
 * A function and not a shared constant: a `Response` body can only be read
 * once, so one instance reused across requests would start failing under any
 * concurrency — and this endpoint's whole job is to be called by someone else.
 */
function acknowledged(): NextResponse {
  return NextResponse.json({ received: true }, { status: 200, headers: NO_STORE });
}

export async function POST(request: Request) {
  // 1 — the untouched string. `request.json()` here would silently break every
  // signature: key order and whitespace are part of what was signed.
  const rawBody = await request.text();

  const env = getSquareEnv();
  const signatureKey = env?.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!env || !signatureKey) {
    // We cannot VERIFY a payment that already happened. A `200` here would drop
    // the notification on the floor for good, so this answers 5xx and lets
    // Square keep retrying for 72 h while the variable gets set.
    console.error("[pago] webhook sin SQUARE_WEBHOOK_SIGNATURE_KEY — no podemos verificar nada");

    return NextResponse.json(
      { error: "NOT_CONFIGURED" },
      { status: 503, headers: NO_STORE },
    );
  }

  // 2 — Next 16: `headers()` is async, the synchronous form no longer exists.
  const signature = (await headers()).get(SQUARE_SIGNATURE_HEADER);

  const valid = verifySquareSignature({
    rawBody,
    signature,
    signatureKey,
    // Built from the configured site URL, NEVER from `request.url`: behind a
    // proxy the host or scheme differs from the public one and no signature
    // ever checks out, with a bare 401 as the only symptom.
    notificationUrl: squareNotificationUrl(env.NEXT_PUBLIC_SITE_URL),
  });

  if (!valid) {
    console.error("[pago] webhook con firma inválida — descartado");

    return NextResponse.json(
      { error: "INVALID_SIGNATURE" },
      { status: 401, headers: NO_STORE },
    );
  }

  const parsed = squareWebhookSchema.safeParse(safeJsonParse(rawBody));

  // A signed body we cannot read is not something Square should resend.
  if (!parsed.success) return acknowledged();

  const payment = parsed.data.data?.object?.payment;

  // 3 — filtered by STATUS, not by event type. A card payment can arrive already
  // `COMPLETED` inside `payment.created`, and listening only for `updated` risks
  // never confirming an appointment that was paid for. Processing both is safe:
  // step 4 collapses them.
  if (!payment || payment.status !== "COMPLETED") return acknowledged();

  const squareEventId = parsed.data.event_id ?? "";
  const orderId = payment.order_id ?? "";

  // 4 — claim the payment in the `Pagos` tab (ADR-013). Keyed by `payment_id`,
  // so the second delivery of the same charge stops right here.
  const claim = await claimPaymentRow({
    paymentId: payment.id,
    squareEventId,
    orderId,
    amountUsd: centsToUsdString(payment.amount_money?.amount),
  });

  if (claim === null) {
    // WF5 did not answer, so we do not know whether this payment was already
    // processed. Proceeding could replace a Meet link that was already emailed
    // (ADR-013), so this answers 5xx and lets Square deliver it again.
    console.error("[pago] WF5 no respondió — no sabemos si este pago ya se procesó", {
      paymentId: payment.id,
    });

    return NextResponse.json(
      { error: "REGISTRY_UNAVAILABLE" },
      { status: 503, headers: NO_STORE },
    );
  }

  if (claim.duplicate) return acknowledged();

  // 5 — answer now. 6 — and only then do the three chained calls that would
  // otherwise blow past Square's ~10 s timeout.
  after(() => fulfil({ paymentId: payment.id, squareEventId, orderId }));

  return acknowledged();
}

/** `JSON.parse` that returns `null` instead of throwing. */
function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Everything that happens after the `200`: turn a claimed payment into a
 * confirmed appointment, or leave a row that says why it is not one.
 *
 * Every exit path writes the `Pagos` row. A row stuck in `recibido` means money
 * taken and nothing delivered, and the only thing worse than that is not being
 * able to tell it apart from a row nobody ever wrote.
 */
async function fulfil(event: {
  paymentId: string;
  squareEventId: string;
  orderId: string;
}): Promise<void> {
  // The amount and the status come from Square, never from the notification.
  // A valid signature proves who sent the message, not that its contents are
  // the truth (ADR-014).
  const read = await readPayment(event.paymentId);

  if (!read?.payment) {
    await fail(event, "No pudimos releer el pago en Square");
    return;
  }

  const payment = read.payment;
  const context = event.orderId ? await readOrderContext(event.orderId) : null;

  if (!context) {
    // No metadata means we cannot know which appointment this was. That is the
    // shape of the dashboard's test event, and also of a payment taken outside
    // this site — neither has an event to confirm.
    await fail(event, "El pago no trae el contexto de la cita (metadata)", payment);
    return;
  }

  // The catalog decides what this should have cost (ADR-006). A mismatch is not
  // something to confirm and sort out later.
  const service = await getServiceBySlug(context.serviceSlug);

  if (service && payment.amountCents !== service.priceCents) {
    await fail(
      event,
      `Monto inesperado: ${payment.amountCents} centavos, el catálogo dice ${service.priceCents}`,
      payment,
      context,
    );
    return;
  }

  // tentative → confirmed, with the Meet link and the emails. A `412` from
  // Google's `If-Match` comes back as `alreadyConfirmed` and is a SUCCESS: a
  // previous delivery already did this, and no second email goes out.
  const confirmation = await confirmAppointment({
    eventId: context.eventId,
    leadId: context.leadId,
    payment,
  });

  if (!confirmation) {
    await fail(event, "El workflow de confirmación no respondió", payment, context);
    return;
  }

  // The appointment is real from here on. A CRM failure past this point loses a
  // row, not a booking — same rule as `/leads` and `/appointments`.
  const crmDelivery = await syncPaymentToCrm({
    leadId: context.leadId,
    paymentId: payment.paymentId,
    amountUsd: payment.amountUsd,
    paidAt: payment.paidAt,
    meetingUrl: confirmation.meetingUrl,
  });

  if (crmDelivery === "failed") {
    console.error("[pago] cita confirmada pero el CRM no avanzó a pagado", {
      paymentId: payment.paymentId,
      eventId: context.eventId,
    });
  }

  await settlePaymentRow({
    paymentId: payment.paymentId,
    squareEventId: event.squareEventId,
    leadId: context.leadId,
    orderId: payment.orderId || event.orderId,
    amountUsd: payment.amountUsd,
    serviceSlug: context.serviceSlug,
    calendarEventId: context.eventId,
    status: "confirmado",
    meetingUrl: confirmation.meetingUrl ?? "",
    detail: crmDelivery === "failed" ? "Confirmada; el CRM no recibió la etapa pagado" : "",
  });
}

/**
 * Marks the `Pagos` row as `error` with the reason, and shouts.
 *
 * This is the path where money was taken and the appointment was not delivered.
 * It is the one failure in this project that must not be silent: someone has to
 * refund or rebook by hand, the same day.
 */
async function fail(
  event: { paymentId: string; squareEventId: string; orderId: string },
  detail: string,
  payment?: ConfirmedPayment,
  context?: OrderContext,
): Promise<void> {
  console.error(`[pago] COBRADO SIN CONFIRMAR — ${detail}`, {
    paymentId: event.paymentId,
    orderId: event.orderId,
  });

  await settlePaymentRow({
    paymentId: event.paymentId,
    squareEventId: event.squareEventId,
    leadId: context?.leadId ?? "",
    orderId: payment?.orderId || event.orderId,
    amountUsd: payment?.amountUsd ?? "",
    serviceSlug: context?.serviceSlug ?? "",
    calendarEventId: context?.eventId ?? "",
    status: "error",
    detail,
  });
}
