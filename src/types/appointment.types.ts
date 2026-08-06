/**
 * Appointment management types — `docs/features/appointment-management.md`.
 *
 * Everything the client may do with their own appointment once it exists: look
 * at it, cancel it, or ask for another time. There is no database behind any of
 * it (ADR-010), so the Calendar event IS the record and n8n is the only thing
 * that can read it (ADR-003, ADR-011).
 *
 * Payloads to n8n are flat `snake_case`, like every other one in this project.
 */

/**
 * State of the appointment, straight from Google Calendar plus one value of our
 * own.
 *
 * `tentative` should not normally be seen here — the link only goes out in the
 * confirmation email, which the payment triggers — but it is representable, so
 * the UI has to have something honest to say about it rather than implying an
 * appointment exists.
 *
 * `past` is not Calendar's: it is `start < now`, decided on the server. It
 * matters because `context.md` §8 stops offering anything at that point.
 */
export type AppointmentStatus = "confirmed" | "tentative" | "cancelled" | "past";

/** Which side of the 24 h line of `context.md` §8 the cancellation falls on. */
export type RefundWindow = "mayor-24h" | "menor-24h";

/**
 * What WF8 `Leos Firm - Consultar cita` answers.
 *
 * Permissive on purpose, same reasoning as `RawCalendarEvent`: the workflow
 * parses plain text out of the event's description, and a field that fails to
 * parse must degrade into an empty string rather than into a broken page.
 */
export type RawAppointmentResponse = {
  found?: boolean;
  status?: string | null;
  start_utc?: string | null;
  end_utc?: string | null;
  service_name?: string | null;
  service_slug?: string | null;
  lead_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  client_timezone?: string | null;
  meeting_url?: string | null;
};

/**
 * The appointment as the rest of the app reasons about it: normalised, with
 * every date a UTC instant and no `null` anywhere.
 *
 * This is server-side only — it carries the client's name and email, which the
 * page does not render and which must not be handed to the browser.
 */
export type Appointment = {
  eventId: string;
  /** Raw Calendar status. `past` is decided by the caller, not stored here. */
  status: Exclude<AppointmentStatus, "past">;
  startUtc: string;
  endUtc: string;
  serviceName: string;
  serviceSlug: string;
  leadId: string;
  fullName: string;
  email: string;
  /** The zone the visitor was in WHEN THEY BOOKED. A starting guess, not truth. */
  clientTimezone: string;
  meetingUrl: string;
};

/**
 * What the page is allowed to show. No name, no email, no `leadId` — the page
 * is public to whoever holds the link, and none of that is needed to display an
 * appointment (`docs/03-security.md` § PII).
 */
export type AppointmentView = {
  status: AppointmentStatus;
  startUtc: string;
  endUtc: string;
  serviceName: string;
  meetingUrl: string;
  /** Zone captured at booking. The browser overrides it with its own if it can. */
  bookedTimezone: string;
  /** Hours left until it starts, computed on the server in UTC. Negative if past. */
  hoursUntilStart: number;
  /** `null` once the appointment can no longer be cancelled from here. */
  refundWindow: RefundWindow | null;
  /** Whether the two buttons are offered at all. */
  canBeManaged: boolean;
};

/**
 * Payload of WF9 `Leos Firm - Cancelar cita`.
 *
 * `refund_window` and `hours_until_start` are computed by the server and go in
 * the email to Claudia: they are what tells her whether a refund applies. She
 * would otherwise have to open the calendar, read the appointment's time, read
 * the email's timestamp and subtract — a calculation the server already did.
 *
 * `stage` and `updated_at` are the CRM columns the workflow writes. Only three
 * columns are touched (`ID`, `Estado`, `Actualizado`) so the sheet needs no new
 * ones — the rest of the story is in the email and in the Calendar event.
 */
export type CancelAppointmentPayload = {
  event_id: string;
  lead_id: string;
  full_name: string;
  email: string;
  service_name: string;
  start_utc: string;
  client_timezone: string;
  cancelled_at: string;
  refund_window: RefundWindow;
  hours_until_start: string;
  stage: "cancelado";
  updated_at: string;
};

/**
 * What WF9 answers.
 *
 * `alreadyCancelled` is a SUCCESS: someone clicked twice, or opened the link on
 * two devices. There is nothing to preserve here the way there is with a Meet
 * link (ADR-013), so it needs no `If-Match` — just a branch that does not send
 * a second pair of emails.
 */
export type CancelAppointmentResult = {
  cancelled?: boolean;
  alreadyCancelled?: boolean;
};

/**
 * Payload of WF10 `Leos Firm - Pedir otro horario`.
 *
 * It touches neither Calendar nor the sheet: **nothing has happened yet**. The
 * appointment stands until Claudia and the client agree on something else.
 */
export type RescheduleRequestPayload = {
  event_id: string;
  lead_id: string;
  full_name: string;
  email: string;
  service_name: string;
  start_utc: string;
  client_timezone: string;
  /** Free text, capped at 500 chars by Zod. Untrusted — n8n escapes it. */
  preference: string;
  requested_at: string;
};

export type RescheduleRequestResult = {
  received?: boolean;
};
