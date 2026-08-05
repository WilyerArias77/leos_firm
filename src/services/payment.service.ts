import "server-only";
import { createHash } from "node:crypto";
import { SquareError } from "square";
import { centsToNumber, centsToUsdString, getSquareClient } from "@/lib/square/client";
import { requestFromN8n } from "@/lib/n8n/client";
import { ORDER_METADATA_KEYS } from "@/types/payment.types";
import type { Service } from "@/types/content.types";
import type {
  ConfirmAppointmentPayload,
  ConfirmAppointmentResult,
  ConfirmedPayment,
  OrderContext,
  PaymentRegistryClaim,
  PaymentRegistryRow,
  PaymentRegistryStatus,
  PaymentStatus,
} from "@/types/payment.types";

/**
 * The business rules of taking a payment (`docs/features/payments.md`).
 *
 * `src/lib/square/client.ts` knows how to speak to Square; this module knows
 * WHAT to charge, WHEN a payment counts and WHAT happens next (Mandamiento II).
 * No component and no route handler talks to the Square SDK directly.
 *
 * The one rule that shapes everything here: **the browser confirms nothing**
 * (ADR-002). Every function below either charges, or reads Square back, or
 * hands work to n8n — none of them takes a client's word for anything.
 */

/** Square's currency for this account. Verified by API: `LB2XHFGDVRJZJ` is USD. */
const CURRENCY = "USD";

/**
 * `CreatePayment` caps `idempotency_key` at 45 characters, so the derived digest
 * is truncated well inside it. 40 hex chars of SHA-256 is not a collision risk
 * for a key scoped to one lead and one calendar event.
 */
const IDEMPOTENCY_KEY_LENGTH = 40;

/**
 * The idempotency key of an ATTEMPT, not of a click.
 *
 * Derived from `leadId + eventId + priceCents` rather than a fresh UUID, and the
 * difference is the whole protection: a double click, a retried fetch or a
 * refreshed page sends the same key, and Square returns the original payment
 * instead of charging twice. A UUID per click would make every one of those a
 * new charge.
 *
 * The price is part of it on purpose: if the catalog price changes, a new
 * attempt is genuinely a different payment and must not collide with the old.
 */
function idempotencyKeyFor(parts: { leadId: string; eventId: string; priceCents: number }): string {
  return createHash("sha256")
    .update(`${parts.leadId}|${parts.eventId}|${parts.priceCents}`)
    .digest("hex")
    .slice(0, IDEMPOTENCY_KEY_LENGTH);
}

/**
 * Square's payment status, reduced to what the rest of the app reasons about.
 *
 * `COMPLETED` is the only value that means money moved. `APPROVED` does not —
 * it is an authorisation waiting to be captured, and this project always
 * autocompletes, so seeing it means something is still in flight.
 */
function toPaymentStatus(status: string | undefined): PaymentStatus {
  if (status === "COMPLETED") return "paid";
  if (status === "FAILED" || status === "CANCELED") return "failed";

  return "pending";
}

export type ChargeResult =
  | { ok: true; orderId: string; paymentId: string; status: PaymentStatus }
  /** The card was refused. The visitor can try another one; nothing is broken. */
  | { ok: false; reason: "declined"; message: string }
  /** Square is unreachable or misconfigured. Not the visitor's fault. */
  | { ok: false; reason: "upstream" };

/**
 * Creates the order and charges the card.
 *
 * Two calls to Square instead of one, and it is not an accident: the order
 * carries the `metadata` the webhook needs to know WHICH appointment was paid
 * for (ADR-014). Without a database, that metadata is the only bridge between
 * a Square payment and a Google Calendar event.
 *
 * The amount comes from `service.priceCents` — a value the caller read from the
 * catalog on the server. Nothing in this signature accepts an amount (ADR-006).
 */
export async function chargeForAppointment(params: {
  leadId: string;
  eventId: string;
  service: Service;
  sourceId: string;
  verificationToken?: string;
}): Promise<ChargeResult> {
  const client = getSquareClient();

  if (!client) {
    // Missing credentials, not a card problem. The caller offers the phone
    // number rather than a 500 in the middle of a payment.
    console.error("[pago] Square sin configurar — no se puede cobrar");
    return { ok: false, reason: "upstream" };
  }

  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  if (!locationId) {
    console.error("[pago] falta NEXT_PUBLIC_SQUARE_LOCATION_ID");
    return { ok: false, reason: "upstream" };
  }

  const priceCents = params.service.priceCents;
  const idempotencyKey = idempotencyKeyFor({
    leadId: params.leadId,
    eventId: params.eventId,
    priceCents,
  });

  try {
    const orderResponse = await client.orders.create({
      // Same derived key: a retried checkout must reuse its order, not open a
      // second one against the same held slot.
      idempotencyKey: `order-${idempotencyKey}`,
      order: {
        locationId,
        // Visible in Claudia's Square dashboard, so a charge can be traced to a
        // CRM row without anyone's help. 36-char UUID, 40-char limit.
        referenceId: params.leadId,
        lineItems: [
          {
            name: params.service.name,
            quantity: "1",
            basePriceMoney: { amount: BigInt(priceCents), currency: CURRENCY },
          },
        ],
        /**
         * The context the webhook recovers later (ADR-014). Identifiers only —
         * Square documents metadata as unfit for sensitive data, and the name
         * and email are already on the tentative Calendar event that WF3 reads.
         */
        metadata: {
          [ORDER_METADATA_KEYS.leadId]: params.leadId,
          [ORDER_METADATA_KEYS.eventId]: params.eventId,
          [ORDER_METADATA_KEYS.serviceSlug]: params.service.slug,
        },
      },
    });

    const orderId = orderResponse.order?.id;

    if (!orderId) {
      console.error("[pago] Square creó la orden sin devolver id");
      return { ok: false, reason: "upstream" };
    }

    const paymentResponse = await client.payments.create({
      sourceId: params.sourceId,
      idempotencyKey,
      amountMoney: { amount: BigInt(priceCents), currency: CURRENCY },
      orderId,
      locationId,
      referenceId: params.leadId,
      // Capture immediately: this is not a hold on the card, it is the payment
      // that turns a held slot into an appointment.
      autocomplete: true,
      ...(params.verificationToken ? { verificationToken: params.verificationToken } : {}),
    });

    const payment = paymentResponse.payment;

    if (!payment?.id) {
      console.error("[pago] Square aceptó el cobro sin devolver payment id");
      return { ok: false, reason: "upstream" };
    }

    return {
      ok: true,
      orderId,
      paymentId: payment.id,
      status: toPaymentStatus(payment.status),
    };
  } catch (error) {
    return describeChargeFailure(error);
  }
}

/**
 * Turns a thrown Square error into either "the card was refused" or "our side
 * failed", because the two need opposite responses: one is a message the
 * visitor can act on, the other is a phone number and a log line.
 */
function describeChargeFailure(error: unknown): ChargeResult {
  if (!(error instanceof SquareError)) {
    const reason = error instanceof Error ? error.name : "unknown";
    console.error(`[pago] fallo inesperado al cobrar (${reason})`);
    return { ok: false, reason: "upstream" };
  }

  // Card errors are the only ones Square reports as the buyer's business.
  // Anything else — bad token, wrong location, revoked credentials — is ours.
  const cardError = error.errors.find(
    (item) => item.category === "PAYMENT_METHOD_ERROR" || item.category === "REFUND_ERROR",
  );

  if (cardError) {
    // No card data and no Square code in the log: the visitor's message is
    // deliberately vague, and the code adds nothing we can act on.
    console.error(`[pago] tarjeta rechazada (${cardError.code ?? "sin código"})`);

    return {
      ok: false,
      reason: "declined",
      message: DECLINE_MESSAGES[cardError.code ?? ""] ?? DECLINE_FALLBACK,
    };
  }

  console.error(`[pago] Square respondió ${error.statusCode ?? "sin estado"}`);
  return { ok: false, reason: "upstream" };
}

const DECLINE_FALLBACK =
  "Tu banco no autorizó el pago. Revisa los datos o prueba con otra tarjeta.";

/**
 * The refusals worth naming. Everything else gets `DECLINE_FALLBACK`: a code we
 * cannot explain in one sentence is better left unexplained than guessed at.
 */
const DECLINE_MESSAGES: Record<string, string> = {
  CVV_FAILURE: "El código de seguridad (CVV) no coincide. Revísalo e inténtalo de nuevo.",
  ADDRESS_VERIFICATION_FAILURE:
    "El código postal no coincide con el de la tarjeta. Revísalo e inténtalo de nuevo.",
  INVALID_EXPIRATION: "La fecha de vencimiento no es válida.",
  EXPIRED_CARD: "Esa tarjeta está vencida. Prueba con otra.",
  INSUFFICIENT_FUNDS: "La tarjeta no tiene fondos suficientes para este cobro.",
  CARD_DECLINED: DECLINE_FALLBACK,
  CARD_DECLINED_VERIFICATION_REQUIRED:
    "Tu banco pide verificar el pago. Inténtalo de nuevo y completa la verificación.",
  GENERIC_DECLINE: DECLINE_FALLBACK,
};

/**
 * Re-reads a payment from Square. The source of truth for the money.
 *
 * Used by the status poll and by the webhook, and in the webhook's case that is
 * the point: a signed webhook body is still a message whose content we do not
 * control, so the amount and the status are taken from Square, not from it.
 */
export async function readPayment(
  paymentId: string,
): Promise<{ status: PaymentStatus; payment: ConfirmedPayment | null } | null> {
  const client = getSquareClient();
  if (!client) return null;

  try {
    const response = await client.payments.get({ paymentId });
    const payment = response.payment;

    if (!payment?.id) return null;

    const status = toPaymentStatus(payment.status);

    // Only a completed payment gets described as a payment. A pending one has
    // nothing to confirm an appointment with.
    if (status !== "paid") return { status, payment: null };

    const amountCents = centsToNumber(payment.amountMoney?.amount);

    return {
      status,
      payment: {
        paymentId: payment.id,
        orderId: payment.orderId ?? "",
        amountUsd: centsToUsdString(payment.amountMoney?.amount),
        amountCents,
        paidAt: payment.createdAt ?? new Date().toISOString(),
      },
    };
  } catch (error) {
    const reason = error instanceof SquareError ? String(error.statusCode) : "unknown";
    console.error(`[pago] no pudimos leer el pago en Square (${reason})`);
    return null;
  }
}

/**
 * Status of an ORDER, for the payment screen's poll.
 *
 * Keyed by order rather than by payment, and reading the order's own `state`
 * rather than its payment, because that is one call instead of two: an order
 * reaches `COMPLETED` when it is fully paid, which is the entire question the
 * screen is asking. (`payments.md` sketched this as `RetrievePayment`; that
 * would need the order first anyway, to find the payment.)
 *
 * `null` means "we could not tell", which the caller reports as `pending` — the
 * screen must never turn our outage into a failed payment on the visitor's
 * side.
 */
export async function readOrderStatus(orderId: string): Promise<PaymentStatus | null> {
  const client = getSquareClient();
  if (!client) return null;

  try {
    const response = await client.orders.get({ orderId });
    const state = response.order?.state;

    if (state === "COMPLETED") return "paid";
    if (state === "CANCELED") return "failed";

    return "pending";
  } catch (error) {
    const reason = error instanceof SquareError ? String(error.statusCode) : "unknown";
    console.error(`[pago] no pudimos leer el estado de la orden (${reason})`);
    return null;
  }
}

/**
 * The appointment context, read back from the order's metadata (ADR-014).
 *
 * `null` covers both "Square did not answer" and "this order carries no
 * metadata" — the second is what the *Send test event* button in the Square
 * dashboard produces, and it must end in a quiet 200, not a crash.
 */
export async function readOrderContext(orderId: string): Promise<OrderContext | null> {
  const client = getSquareClient();
  if (!client) return null;

  try {
    const response = await client.orders.get({ orderId });
    const metadata = response.order?.metadata;

    const leadId = metadata?.[ORDER_METADATA_KEYS.leadId];
    const eventId = metadata?.[ORDER_METADATA_KEYS.eventId];

    if (!leadId || !eventId) {
      console.error("[pago] la orden no trae metadata de la cita — nada que confirmar");
      return null;
    }

    return {
      leadId,
      eventId,
      serviceSlug: metadata?.[ORDER_METADATA_KEYS.serviceSlug] ?? "",
    };
  } catch (error) {
    const reason = error instanceof SquareError ? String(error.statusCode) : "unknown";
    console.error(`[pago] no pudimos leer la orden en Square (${reason})`);
    return null;
  }
}

/**
 * Claims the payment in the `Pagos` tab — the first-line anti-replay (ADR-013).
 *
 * Keyed by `payment_id`, not by Square's `event_id`: one charge produces both
 * `payment.created` and `payment.updated`, each with its own event id, and a
 * key on that would let both through — two confirmations, two emails.
 *
 * Returns `null` when WF5 did not answer. The caller must treat that as "do not
 * proceed": confirming without having claimed the row is how a Meet link gets
 * replaced after it was already emailed.
 *
 * The row is claimed with what the webhook BODY carries — the id, the order and
 * the amount — because this has to run before the `200`, and re-reading Square
 * first would spend the budget Square gives us. `lead_id`, the service and the
 * calendar event land on the same row seconds later via `settlePaymentRow`,
 * which upserts on `payment_id`.
 */
export async function claimPaymentRow(row: {
  paymentId: string;
  squareEventId: string;
  orderId: string;
  amountUsd: string;
}): Promise<PaymentRegistryClaim | null> {
  const payload: PaymentRegistryRow = {
    payment_id: row.paymentId,
    square_event_id: row.squareEventId,
    received_at: new Date().toISOString(),
    status: "recibido" satisfies PaymentRegistryStatus,
    lead_id: "",
    order_id: row.orderId,
    amount_usd: row.amountUsd,
    service_slug: "",
    calendar_event_id: "",
    meeting_url: "",
    detail: "",
  };

  return requestFromN8n<PaymentRegistryClaim>("payments", payload);
}

/**
 * Closes the `Pagos` row: `confirmado` with the Meet link, or `error` with why.
 *
 * A row left in `recibido` is money charged without an appointment delivered —
 * the one row in this whole system that demands a human (`payments.md`). This
 * function exists so that state is always written, including on the sad path.
 */
export async function settlePaymentRow(row: {
  paymentId: string;
  squareEventId: string;
  leadId: string;
  orderId: string;
  amountUsd: string;
  serviceSlug: string;
  calendarEventId: string;
  status: Extract<PaymentRegistryStatus, "confirmado" | "error">;
  meetingUrl?: string;
  detail?: string;
}): Promise<void> {
  const payload: PaymentRegistryRow = {
    payment_id: row.paymentId,
    square_event_id: row.squareEventId,
    received_at: new Date().toISOString(),
    status: row.status,
    lead_id: row.leadId,
    order_id: row.orderId,
    amount_usd: row.amountUsd,
    service_slug: row.serviceSlug,
    calendar_event_id: row.calendarEventId,
    meeting_url: row.meetingUrl ?? "",
    detail: row.detail ?? "",
  };

  const answered = await requestFromN8n<unknown>("payments", payload);

  if (answered === null) {
    // Loud, because the sheet is now out of step with reality: the appointment
    // may well be confirmed and the row still reads `recibido`.
    console.error("[pago] NO SE PUDO CERRAR LA FILA DE PAGOS", {
      paymentId: row.paymentId,
      status: row.status,
    });
  }
}

/**
 * Hands the confirmation to WF3: tentative event → confirmed, Meet, emails.
 *
 * Returns `null` when n8n did not answer, which is NOT the same as
 * `alreadyConfirmed`. The first is a failure that needs a person; the second is
 * ADR-013's `If-Match` doing its job on a duplicate delivery, and is a success.
 */
export async function confirmAppointment(params: {
  eventId: string;
  leadId: string;
  payment: ConfirmedPayment;
}): Promise<ConfirmAppointmentResult | null> {
  const payload: ConfirmAppointmentPayload = {
    event_id: params.eventId,
    lead_id: params.leadId,
    payment_id: params.payment.paymentId,
    amount_usd: params.payment.amountUsd,
    paid_at: params.payment.paidAt,
  };

  return requestFromN8n<ConfirmAppointmentResult>("confirm", payload);
}
