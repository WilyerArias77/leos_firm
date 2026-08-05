import { z } from "zod";

/**
 * Shape of a Square `payment.*` notification (`docs/features/payments.md`).
 *
 * Deliberately permissive about everything it does not need. The body is used
 * for two things only — deciding whether there is work to do, and claiming the
 * `payment_id` in the `Pagos` tab. Every value that MATTERS (the status, the
 * amount, the appointment it belongs to) is re-read from Square afterwards, so
 * this schema is a filter, not a source of truth (ADR-014).
 *
 * It must also survive the dashboard's *Send test event* button, which sends a
 * well-formed notification about an order that does not exist. That has to end
 * in a quiet `200`, never a crash — a handler that throws makes the button look
 * like proof the webhook is broken.
 */

const money = z
  .object({
    /** Cents. Square sends a JSON number here, not the SDK's `bigint`. */
    amount: z.number().int().nonnegative().optional(),
    currency: z.string().optional(),
  })
  .optional();

export const squareWebhookSchema = z.object({
  /** `payment.created`, `payment.updated`, `refund.created`… */
  type: z.string().min(1),
  /**
   * Square's own id for the NOTIFICATION, not for the payment.
   *
   * One charge produces two of these (`created` and `updated`), which is
   * exactly why it is not the key of the `Pagos` tab — it is only kept there to
   * trace which delivery arrived first.
   */
  event_id: z.string().min(1).optional(),
  data: z
    .object({
      object: z
        .object({
          payment: z
            .object({
              id: z.string().min(1),
              status: z.string().optional(),
              order_id: z.string().optional(),
              amount_money: money,
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export type SquareWebhookEvent = z.infer<typeof squareWebhookSchema>;
