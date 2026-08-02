/**
 * Business constants for Leos Firm LLC.
 *
 * Source of truth: `context.md`. These values encode rules that the rest of the
 * codebase must never re-derive or hardcode inline.
 */

export const COMPANY = {
  legalName: "Leos Firm LLC",
  ceo: "Claudia Leos",
  address: "18830 Stone Oak Pkwy, Suite 106, San Antonio, Texas 78258",
  phone: "(210) 630 7878",
  website: "https://www.leosfirm.com",
  tagline:
    "No abrimos empresas. Construimos el puente para que los empresarios conviertan sus proyectos en negocios exitosos en Estados Unidos.",
} as const;

/** The firm operates on Central Time; the DB always stores UTC. */
export const BUSINESS_TIMEZONE = "America/Chicago";

/**
 * Office hours in `BUSINESS_TIMEZONE`, 24h format.
 * Availability is these hours minus Google Calendar busy blocks (ADR-003).
 */
export const BUSINESS_HOURS = {
  /** 1 = Monday … 5 = Friday. Weekends closed. */
  workingDays: [1, 2, 3, 4, 5],
  startHour: 9,
  endHour: 17,
  /** Slots start on the hour; gap between appointments. */
  slotIntervalMinutes: 60,
  bufferMinutes: 15,
} as const;

/**
 * Cancellation and rescheduling policy (`context.md` §8).
 * The server decides refunds from these values — never the client.
 */
export const CANCELLATION_POLICY = {
  /** Free rescheduling and refund-eligible cancellation above this threshold. */
  freeChangeWindowHours: 24,
  /** Grace period before a client counts as a no-show. */
  lateArrivalGraceMinutes: 15,
  /** Free minutes granted to clients referred by immigration lawyers. */
  referralFreeMinutes: 30,
} as const;

/** How long a slot stays held while the client fills in the intake form. */
export const SLOT_HOLD_MINUTES = 10;

/** Max size per intake attachment (`docs/DB_SCHEMA.md`). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Private Storage bucket for intake attachments — never make it public. */
export const INTAKE_BUCKET = "intake-documents";
