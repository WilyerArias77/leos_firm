/**
 * Payment types — `docs/features/payments.md`.
 *
 * Two contracts live here, and they are deliberately different sizes:
 *
 * - What the BROWSER may know: the order id and a three-valued status. Nothing
 *   about amounts, cards or calendar events (ADR-002 — the browser confirms
 *   nothing, so it needs nothing to confirm it with).
 * - What travels to n8n so the appointment can be confirmed and the sheet
 *   written. Flat `snake_case`, like every other n8n payload.
 */

/**
 * State of a payment as the payment screen is allowed to see it.
 *
 * Reduced to three values on purpose: Square has a dozen and none of them are
 * the visitor's business. `paid` here means "Square says the money cleared" —
 * it does NOT mean the appointment is confirmed. That is what the webhook does,
 * out of band, and the screen says so in words.
 */
export type PaymentStatus = "pending" | "paid" | "failed";

/** Response of `POST /api/v1/checkout`. The payment is NOT confirmed yet. */
export type CheckoutResult = {
  orderId: string;
  /** Square's payment id, so the status poll does not need the order. */
  paymentId: string;
  status: PaymentStatus;
};

/**
 * The context the webhook recovers from the order's metadata (ADR-014).
 *
 * Without a database this is the only bridge between "someone paid" and "which
 * appointment that was". Every field is an identifier — no PII ever goes into
 * Square metadata.
 */
export type OrderContext = {
  leadId: string;
  eventId: string;
  serviceSlug: string;
};

/** Keys used in `Order.metadata`. Square only allows `[a-zA-Z0-9_-]`. */
export const ORDER_METADATA_KEYS = {
  leadId: "lead_id",
  eventId: "event_id",
  serviceSlug: "service_slug",
} as const;

/**
 * What the payment webhook knows about the money once it has re-read it from
 * Square. The webhook body is used for its signature and for nothing else
 * (ADR-014), so every value here comes from `RetrievePayment`.
 */
export type ConfirmedPayment = {
  paymentId: string;
  orderId: string;
  /** Plain decimal string, as everything the sheet stores (`"150.00"`). */
  amountUsd: string;
  amountCents: number;
  paidAt: string;
};

/**
 * Payload of the WF3 `Leos Firm - Confirmar cita` webhook.
 *
 * Name, email and service are NOT here: the workflow reads them off the
 * tentative event it is about to confirm (ADR-014). Sending them would be a
 * second source of truth for the same fact.
 *
 * The last two fields are the exception, and they are not data the event has:
 * they are the client's link to manage their own appointment (FASE 9,
 * `docs/features/appointment-management.md`). The token is SIGNED HERE because
 * the signing key never leaves the app (Mandamiento VIII), and the full URL
 * travels alongside it so n8n never has to concatenate a path onto a host — one
 * stray slash there is a broken link nobody notices until a client reports it.
 */
export type ConfirmAppointmentPayload = {
  event_id: string;
  lead_id: string;
  payment_id: string;
  amount_usd: string;
  paid_at: string;
  /** HMAC-signed, stateless, no PII inside (ADR-016). */
  access_token: string;
  /** `https://<site>/agendar/cita/<token>` — what the email links to. */
  appointment_url: string;
};

/**
 * What WF3 answers.
 *
 * `alreadyConfirmed` is the 412 from Google's `If-Match` surfacing as a normal
 * answer (ADR-013): the event was already confirmed by a previous delivery of
 * the same payment. It is a success — no second Meet, no second email.
 */
export type ConfirmAppointmentResult = {
  meetingUrl?: string;
  alreadyConfirmed?: boolean;
};

/** Row of the `Pagos` tab. One per Square payment, keyed by `payment_id`. */
export type PaymentRegistryStatus = "recibido" | "confirmado" | "error";

export type PaymentRegistryRow = {
  payment_id: string;
  square_event_id: string;
  received_at: string;
  status: PaymentRegistryStatus;
  lead_id: string;
  order_id: string;
  amount_usd: string;
  service_slug: string;
  calendar_event_id: string;
  meeting_url: string;
  detail: string;
};

/**
 * What WF5 answers when a row is claimed.
 *
 * `duplicate: true` means this `payment_id` was already in the sheet, i.e. a
 * second delivery of the same payment (Square sends `payment.created` AND
 * `payment.updated` for one charge). The webhook then does nothing at all.
 */
export type PaymentRegistryClaim = {
  duplicate: boolean;
};
