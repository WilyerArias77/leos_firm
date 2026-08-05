import type { Service } from "@/types/content.types";

/**
 * How the payment ended, from the panel's point of view.
 *
 * - `confirmed` — Square says the money cleared. The appointment is being
 *   confirmed by the webhook right now (ADR-002).
 * - `processing` — the charge was accepted and we stopped asking. NOT a failure:
 *   the webhook confirms out of band and the email goes out regardless. The
 *   difference from `confirmed` is only what we are entitled to claim on screen.
 */
export type PaymentOutcome = "confirmed" | "processing";

export type PaymentPanelProps = {
  /** From the catalog, on the server (ADR-006). The panel never sets a price. */
  service: Service;
  /** Row key of the CRM, so the payment lands on the right line (ADR-008). */
  leadId: string;
  /** The tentative Calendar event this payment confirms (ADR-011). */
  eventId: string;
  /**
   * Who is paying — used ONLY for Square's 3-D Secure challenge, which needs a
   * billing contact. It is not sent to our API: the server already has these
   * from the booking step.
   */
  payer: { fullName: string; email: string };
  onOutcome: (outcome: PaymentOutcome) => void;
};
