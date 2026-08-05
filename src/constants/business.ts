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
  /**
   * Header slogan. Provided by the client on 2026-08-03 — it is NOT in
   * `context.md` §1, which holds the longer `tagline` used in the hero.
   * Both coexist on purpose: this one has to fit in one line of the header.
   */
  slogan: "Expande tus negocios en Estados Unidos con la estrategia fiscal correcta",
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
 * Price of the initial consultation (ADR-009).
 *
 * The six services that used to be quote-based now charge this amount to book
 * the first session, and it is credited toward the final quote Claudia gives
 * during the call. It lives here — not spread across the catalog — so changing
 * it is one number in one file.
 */
export const INITIAL_CONSULTATION = {
  priceCents: 5_000,
  durationMinutes: 60,
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

/**
 * When the free-diagnosis popup shows up (`docs/features/lead-diagnostic.md`).
 *
 * It must not fire on first paint: the visitor has to read a bit of the page
 * first, otherwise the popup reads as an ad and gets dismissed on reflex.
 * Whichever trigger happens first wins.
 */
export const DIAGNOSTIC_PROMPT = {
  /** Time on the page before the popup opens by itself. */
  autoOpenDelayMs: 10_000,
  /** …or this much of the page scrolled, whichever comes first. */
  scrollTriggerRatio: 0.3,
  /** Declined → do not ask again for the rest of the session. */
  declinedStorageKey: "leosfirm:diagnostico:rechazado",
  /** Completed → do not ask again on this device. */
  completedStorageKey: "leosfirm:diagnostico:completado",
} as const;

/**
 * Where the browser keeps the `leadId` after the diagnosis
 * (`docs/features/crm-sheets.md`).
 *
 * `sessionStorage`, not `localStorage`: it has to survive the walk from the
 * popup to scheduling and payment, and nothing more. A stale id from last
 * month would update the wrong CRM row.
 */
export const LEAD_STORAGE_KEY = "leosfirm:lead:id";

/** Rate limit for `POST /api/v1/leads` (`docs/03-security.md`). */
export const LEAD_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 10 * 60 * 1000,
} as const;
