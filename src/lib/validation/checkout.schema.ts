import { z } from "zod";

/**
 * Validation for the checkout — shared by the browser and the server, like
 * `appointment.schema.ts` (`docs/03-security.md`).
 *
 * What is NOT in this schema is the point of it: **there is no `amount` field**.
 * The price is read on the server from the catalog by `serviceSlug` (ADR-006).
 * If a client sends an amount, it is not "rejected" — it simply has nowhere to
 * land, which is the only way to be sure it can never be charged.
 */

export const checkoutSchema = z.object({
  /** Row key of the CRM. Ties the payment to the diagnosis (ADR-008). */
  leadId: z.string().uuid("Identificador de solicitud inválido"),
  serviceSlug: z.string().min(1).max(80),

  /**
   * The tentative Calendar event that this payment confirms (ADR-011).
   *
   * Required, and the endpoint does not compensate for its absence: the slot is
   * held before anyone sees a card form. A checkout without an event id is a
   * client bug, not a booking to rescue by reserving something here.
   */
  eventId: z.string().min(1, "Falta el horario apartado").max(200),

  /**
   * Single-use token from the Web Payments SDK.
   *
   * The card itself never reaches our server — this is what replaces it, and it
   * is why this project has no card fields anywhere (`docs/03-security.md`).
   */
  sourceId: z.string().min(1, "No pudimos leer los datos de la tarjeta").max(500),

  /**
   * 3-D Secure / SCA result from `payments.verifyBuyer()`. Optional because not
   * every card is challenged, and a missing token must not block the ones that
   * are not.
   */
  verificationToken: z.string().min(1).max(2_000).optional(),
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;
