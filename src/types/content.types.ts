/**
 * Content types for the public site.
 *
 * `Service` mirrors the future `services` table in `docs/DB_SCHEMA.md` on
 * purpose: when the catalog moves to a database, only `service.service.ts`
 * changes — components keep the same shape.
 */

/**
 * What the amount the visitor pays online actually buys (ADR-009).
 *
 * - `full-service` — the payment closes the service. Nothing else is charged.
 * - `initial-consultation` — the payment covers the first session and is
 *   credited toward the final quote, which Claudia gives during that call.
 *
 * Both models charge online and both book a slot: the difference is what the
 * client is told they are paying for, never whether the flow changes.
 */
export type PricingModel = "full-service" | "initial-consultation";

export type Service = {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  /**
   * USD cents. Never `null` and never `0`: since ADR-009 every service in the
   * catalog is charged online before the appointment exists.
   */
  priceCents: number;
  pricingModel: PricingModel;
  /** Length of the booked session. Every service books one (ADR-009). */
  durationMinutes: number;
  /** Recurring billing (bookkeeping, payroll) — arranged after the session. */
  isSubscription: boolean;
  /** What the client gets. Sourced from context.md — never invented. */
  includes: string[];
  displayOrder: number;
  isActive: boolean;
};

export type FaqItem = {
  question: string;
  /** Official answer written by the firm. Required: never publish a question we cannot answer. */
  answer: string;
};

export type PolicyItem = {
  title: string;
  description: string;
};

export type CompanyValue = {
  name: string;
  description: string;
};
