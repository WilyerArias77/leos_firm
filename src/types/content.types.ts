/**
 * Content types for the public site.
 *
 * `Service` mirrors the future `services` table in `docs/DB_SCHEMA.md` on
 * purpose: when the catalog moves to Supabase in FASE 3, only
 * `service.service.ts` changes — components keep the same shape.
 */

export type Service = {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  /** USD cents. `null` means the price depends on the case → "Requiere cotización". */
  priceCents: number | null;
  durationMinutes: number | null;
  /** Whether buying it starts the scheduling flow. */
  requiresAppointment: boolean;
  /** Recurring billing (bookkeeping, payroll). */
  isSubscription: boolean;
  /** What the client gets. Sourced from context.md — never invented. */
  includes: string[];
  displayOrder: number;
  isActive: boolean;
};

export type FaqItem = {
  question: string;
  /** `null` while Claudia has not written the official answer yet. */
  answer: string | null;
};

export type PolicyItem = {
  title: string;
  description: string;
};

export type CompanyValue = {
  name: string;
  description: string;
};
