import { BUSINESS_TIMEZONE, CANCELLATION_POLICY } from "@/constants/business";
import { requestFromN8n } from "@/lib/n8n/client";
import { isValidTimeZone } from "@/lib/utils/timezone";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentView,
  CancelAppointmentPayload,
  CancelAppointmentResult,
  RawAppointmentResponse,
  RefundWindow,
  RescheduleRequestPayload,
  RescheduleRequestResult,
} from "@/types/appointment.types";

/**
 * The business rules of managing an appointment already made
 * (`docs/features/appointment-management.md`).
 *
 * Same split as everywhere else: `src/lib/n8n/client.ts` knows how to reach
 * Google, this module knows WHAT the policy says and WHEN it applies
 * (Mandamiento II). No component and no route handler decides any of it.
 *
 * The one rule that shapes the whole file: **the cancellation policy is decided
 * on the server, in UTC, from the appointment's own start time.** Nothing here
 * accepts a verdict, an hour count or a refund decision from a client — a value
 * the client can write is not a rule, it is a suggestion.
 */

const HOUR_MS = 60 * 60 * 1000;

/** Calendar statuses we know how to talk about. Anything else is `confirmed`. */
const KNOWN_STATUSES: readonly string[] = ["confirmed", "tentative", "cancelled"];

export type AppointmentLookup =
  | { ok: true; appointment: Appointment }
  /** The token was valid but the event is gone. The caller answers 404. */
  | { ok: false; reason: "not-found" }
  /** n8n did not answer. NOT the same as gone — the caller answers 502. */
  | { ok: false; reason: "upstream" };

/**
 * Reads the appointment behind an event id (WF8 `Leos Firm - Consultar cita`).
 *
 * The distinction between the two failures is the same one `fetchBusyBlocks`
 * makes and it matters as much: "this appointment does not exist" and "we could
 * not ask" look identical to a caller that collapses them, and telling someone
 * their appointment is gone because our integration is down is the worse of the
 * two mistakes by a wide margin.
 */
export async function fetchAppointment(eventId: string): Promise<AppointmentLookup> {
  const response = await requestFromN8n<RawAppointmentResponse>("appointment", {
    event_id: eventId,
  });

  if (response === null) {
    console.error("[cita] no pudimos leer la cita en el calendario", { eventId });
    return { ok: false, reason: "upstream" };
  }

  // `found: false` is the workflow reporting a 404 from Google as data rather
  // than as a thrown error — the `fullResponse` + `neverError` pattern the WF3
  // already uses.
  if (response.found === false) return { ok: false, reason: "not-found" };

  const startUtc = response.start_utc ?? "";
  const endUtc = response.end_utc ?? "";

  // Without a start there is no appointment to show and no policy to apply.
  // Treating it as "not found" is the honest reading: whatever came back, it
  // was not an appointment.
  if (!startUtc || Number.isNaN(Date.parse(startUtc))) {
    console.error("[cita] la respuesta no trae una fecha utilizable", { eventId });
    return { ok: false, reason: "not-found" };
  }

  const rawStatus = response.status ?? "confirmed";

  return {
    ok: true,
    appointment: {
      eventId,
      status: KNOWN_STATUSES.includes(rawStatus)
        ? (rawStatus as Appointment["status"])
        : "confirmed",
      startUtc,
      endUtc: endUtc && !Number.isNaN(Date.parse(endUtc)) ? endUtc : startUtc,
      serviceName: response.service_name ?? "Consulta",
      serviceSlug: response.service_slug ?? "",
      leadId: response.lead_id ?? "",
      fullName: response.full_name ?? "",
      email: response.email ?? "",
      // The zone is untrusted input by the time it gets here: it was typed into
      // a calendar description by a workflow. An unknown IANA name would throw
      // inside `Intl` and turn a valid link into a 500.
      clientTimezone: isValidTimeZone(response.client_timezone ?? "")
        ? (response.client_timezone as string)
        : BUSINESS_TIMEZONE,
      meetingUrl: response.meeting_url ?? "",
    },
  };
}

export type CancellationWindow = {
  /** Hours from `now` to the start. Negative once it has begun. */
  hoursUntilStart: number;
  /** `null` when the appointment already started — §8 stops offering anything. */
  refundWindow: RefundWindow | null;
};

/**
 * Which side of the 24 h line this cancellation falls on (`context.md` §8).
 *
 * All arithmetic in UTC, on absolute instants: no zone, no wall clock, no
 * daylight saving. "24 hours before" is a duration, and a duration does not
 * change because the client is in Madrid or because Chicago moved its clocks.
 *
 * The threshold is `CANCELLATION_POLICY.freeChangeWindowHours`, which already
 * existed and already said 24. It is not restated here.
 */
export function describeCancellationWindow(startUtc: string, now: Date): CancellationWindow {
  const hoursUntilStart = (Date.parse(startUtc) - now.getTime()) / HOUR_MS;

  if (hoursUntilStart <= 0) return { hoursUntilStart, refundWindow: null };

  return {
    hoursUntilStart,
    refundWindow:
      hoursUntilStart >= CANCELLATION_POLICY.freeChangeWindowHours ? "mayor-24h" : "menor-24h",
  };
}

/**
 * The appointment reduced to what the page may render.
 *
 * The name, the email and the `leadId` are dropped here on purpose: the page is
 * public to whoever holds the link and none of them is needed to show an
 * appointment (`docs/03-security.md` § PII).
 */
export function toAppointmentView(appointment: Appointment, now: Date): AppointmentView {
  const { hoursUntilStart, refundWindow } = describeCancellationWindow(
    appointment.startUtc,
    now,
  );

  const status: AppointmentStatus =
    appointment.status === "cancelled"
      ? "cancelled"
      : hoursUntilStart <= 0
        ? "past"
        : appointment.status;

  return {
    status,
    startUtc: appointment.startUtc,
    endUtc: appointment.endUtc,
    serviceName: appointment.serviceName,
    meetingUrl: appointment.meetingUrl,
    bookedTimezone: appointment.clientTimezone,
    hoursUntilStart,
    refundWindow,
    // Neither button is offered once it started or once it is cancelled. §8 is
    // explicit that a session already begun is a session already delivered.
    canBeManaged: status === "confirmed" || status === "tentative",
  };
}

export type CancelOutcome =
  | { ok: true; alreadyCancelled: boolean }
  /** The appointment already started. §8: nothing to offer from here. */
  | { ok: false; reason: "past" }
  /** n8n did not answer. The appointment is STILL ALIVE and we say so. */
  | { ok: false; reason: "upstream" };

/**
 * Cancels the appointment (WF9 `Leos Firm - Cancelar cita`).
 *
 * The workflow frees the slot in Calendar, writes `cancelado` to the CRM and
 * sends the two emails. **No refund happens anywhere in this path** — Claudia
 * issues it from her Square dashboard, which is where the money already lives
 * (`03-security.md`: no refunds from a public endpoint).
 *
 * The verdict travels with the payload because it is what tells her whether a
 * refund applies at all, and it is recomputed HERE rather than taken from the
 * page: someone can open the link at 24 h and 10 minutes and click half an hour
 * later. The page informs; this decides.
 */
export async function cancelAppointment(
  appointment: Appointment,
  now: Date,
): Promise<CancelOutcome> {
  const { hoursUntilStart, refundWindow } = describeCancellationWindow(
    appointment.startUtc,
    now,
  );

  if (refundWindow === null) return { ok: false, reason: "past" };

  const timestamp = now.toISOString();

  const payload: CancelAppointmentPayload = {
    event_id: appointment.eventId,
    lead_id: appointment.leadId,
    full_name: appointment.fullName,
    email: appointment.email,
    service_name: appointment.serviceName,
    start_utc: appointment.startUtc,
    client_timezone: appointment.clientTimezone,
    cancelled_at: timestamp,
    refund_window: refundWindow,
    hours_until_start: hoursUntilStart.toFixed(1),
    stage: "cancelado",
    updated_at: timestamp,
  };

  const result = await requestFromN8n<CancelAppointmentResult>("cancel", payload);

  if (result === null) {
    // Loud, and the caller says it out loud too: the visitor pressed cancel and
    // nothing was cancelled. Leaving them believing otherwise is the one thing
    // this endpoint must never do.
    console.error("[cita] el workflow de cancelación no respondió — la cita SIGUE VIVA", {
      eventId: appointment.eventId,
      leadId: appointment.leadId,
    });

    return { ok: false, reason: "upstream" };
  }

  return { ok: true, alreadyCancelled: result.alreadyCancelled === true };
}

export type RescheduleOutcome =
  | { ok: true }
  | { ok: false; reason: "past" }
  | { ok: false; reason: "upstream" };

/**
 * Emails Claudia the time the client would prefer (WF10). **It reschedules
 * nothing**, and neither does the workflow: no calendar event is moved and no
 * CRM stage changes, because until she agrees on something else the original
 * appointment still stands.
 */
export async function requestReschedule(
  appointment: Appointment,
  preference: string,
  now: Date,
): Promise<RescheduleOutcome> {
  const { refundWindow } = describeCancellationWindow(appointment.startUtc, now);

  if (refundWindow === null) return { ok: false, reason: "past" };

  const payload: RescheduleRequestPayload = {
    event_id: appointment.eventId,
    lead_id: appointment.leadId,
    full_name: appointment.fullName,
    email: appointment.email,
    service_name: appointment.serviceName,
    start_utc: appointment.startUtc,
    client_timezone: appointment.clientTimezone,
    preference,
    requested_at: now.toISOString(),
  };

  const result = await requestFromN8n<RescheduleRequestResult>("reschedule", payload);

  if (result === null) {
    console.error("[cita] el workflow de reprogramación no respondió", {
      eventId: appointment.eventId,
      leadId: appointment.leadId,
    });

    return { ok: false, reason: "upstream" };
  }

  return { ok: true };
}
