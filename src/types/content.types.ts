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
 * - `deposit` — the payment **holds the appointment** and is credited, in full,
 *   against the real cost of the service. Claudia gives that cost during the
 *   call, because she prices per case.
 *
 * Both models charge online and both book a slot: the difference is what the
 * client is told they are paying for, never whether the flow changes.
 *
 * ⚠️ **This member used to be called `initial-consultation`, and the name was the
 * bug** (renamed 2026-08-06, at the client's correction). It read as though the
 * $50 bought a first consultation — a cheap product with its own scope — when it
 * buys nothing on its own: it is money on account. Every surface that showed it
 * inherited that reading, and the label the visitor saw literally said
 * «Consulta inicial». Do not reintroduce the old name, in code or in copy.
 */
export type PricingModel = "full-service" | "deposit";

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
