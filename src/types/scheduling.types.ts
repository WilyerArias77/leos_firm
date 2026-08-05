import type { CalendarDay } from "@/lib/utils/timezone";

/**
 * Scheduling types — `docs/features/scheduling.md`.
 *
 * Next.js never talks to Google: n8n returns Claudia's busy blocks and this
 * app does the arithmetic (ADR-010). These types describe both ends of that
 * contract — what n8n may hand us, and what we hand the browser.
 */

/**
 * An event exactly as n8n may return it.
 *
 * Deliberately permissive, and that is the whole point: the workflow is being
 * built by someone else, in parallel, and the doc (§ Contrato exacto) promises
 * that BOTH the flattened shape and Google's raw objects are accepted. Being
 * strict here would mean a shape mismatch shows up as an empty calendar with
 * no error — the most expensive failure this feature can have.
 *
 * `normalizeBusyBlocks` in `availability.service.ts` is what makes sense of it.
 */
export type RawCalendarEvent = {
  /** ISO string (flat form) or Google's `{ dateTime }` / `{ date }` object. */
  start?: string | { dateTime?: string | null; date?: string | null } | null;
  end?: string | { dateTime?: string | null; date?: string | null } | null;
  /** `confirmed` | `tentative` | `cancelled`. Cancelled events do not block. */
  status?: string | null;
  /** `transparent` means "shows as Free" in Google — it does not block. */
  transparency?: string | null;
};

/** A stretch of time Claudia is not available, as a pair of UTC instants. */
export type BusyBlock = {
  startUtc: string;
  endUtc: string;
};

/** A bookable hour. Always UTC — the browser converts for display. */
export type Slot = {
  startUtc: string;
  endUtc: string;
};

/**
 * The free slots of one square on the visitor's calendar.
 *
 * `day` is the calendar day in the VISITOR's zone, not the firm's: a 17:00
 * appointment in San Antonio is already tomorrow morning in Tokyo, and it has
 * to appear on the square the visitor would look at.
 */
export type DayAvailability = {
  day: CalendarDay;
  slots: Slot[];
};

export type AvailabilityResult = {
  /** Zone the days were grouped by — echoed back so the UI can label it. */
  clientTimezone: string;
  /** Always `America/Chicago`. Shown alongside, never instead. */
  businessTimezone: string;
  days: DayAvailability[];
  /**
   * First day in the returned range with at least one free slot, so the UI can
   * open on a useful square instead of an empty one. `null` when the whole
   * range is full — that is what tells the visitor to try the next month.
   */
  nextAvailableFrom: CalendarDay | null;
};

/** What `POST /api/v1/appointments` gives back once the slot is held. */
export type AppointmentHold = {
  /** Google Calendar event id. Travels to the Square webhook (FASE 6). */
  eventId: string;
  startUtc: string;
  endUtc: string;
  clientTimezone: string;
  businessTimezone: string;
  /** Whether the CRM row reached the sheet. A failure does not block booking. */
  crmDelivery: "delivered" | "failed";
};
