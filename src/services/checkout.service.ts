import { API_ROUTES } from "@/constants/routes";
import { checkoutSchema } from "@/lib/validation/checkout.schema";
import { toFieldErrors } from "@/lib/validation/lead.schema";
import type { CheckoutPayload } from "@/lib/validation/checkout.schema";
import type { CheckoutResult, PaymentStatus } from "@/types/payment.types";

/**
 * The browser's side of paying: talks to OUR API, never to Square's.
 *
 * Mirrors `appointment.service.ts`. The card token is the only thing about the
 * card that exists on this side — the number never leaves Square's iframe
 * (`docs/03-security.md`).
 *
 * Nothing here confirms an appointment, and nothing here can. `submitCheckout`
 * reports that the charge was accepted; the appointment becomes real when the
 * webhook says so (ADR-002).
 */

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  details?: Record<string, string>;
};

export type CheckoutSubmission =
  | { ok: true; result: CheckoutResult }
  /** `declined` is the visitor's to fix; everything else is ours. */
  | { ok: false; declined: boolean; message: string; fieldErrors?: Record<string, string> };

const GENERIC_FAILURE = "No pudimos procesar el pago. Vuelve a intentarlo en un momento.";

export async function submitCheckout(payload: CheckoutPayload): Promise<CheckoutSubmission> {
  // The same schema the server runs — here for instant feedback, there because
  // it is the only verdict that counts.
  const parsed = checkoutSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      declined: false,
      message: "Revisa los datos del pago.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const response = await fetch(API_ROUTES.checkout, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const body: ApiEnvelope<CheckoutResult> & { error?: string } = await response
      .json()
      .catch(() => ({}));

    if (!response.ok || !body.data) {
      return {
        ok: false,
        declined: body.error === "PAYMENT_DECLINED",
        message: body.message ?? GENERIC_FAILURE,
        fieldErrors: body.details,
      };
    }

    return { ok: true, result: body.data };
  } catch {
    return { ok: false, declined: false, message: "No pudimos conectar con el servidor." };
  }
}

/**
 * Asks whether the money cleared. Used by the "processing" screen.
 *
 * Returns `"pending"` on any failure of ours, never `"failed"`: the charge may
 * well have gone through, and telling someone their payment failed because we
 * could not ask is the worst answer available.
 */
export async function fetchOrderStatus(orderId: string): Promise<PaymentStatus> {
  try {
    const response = await fetch(API_ROUTES.orderStatus(orderId));
    const body: ApiEnvelope<{ status: PaymentStatus }> = await response.json().catch(() => ({}));

    return body.data?.status ?? "pending";
  } catch {
    return "pending";
  }
}
