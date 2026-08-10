import "server-only";
import { BUSINESS_TIMEZONE } from "@/constants/business";
import { calendarDayOf, parseCalendarDay, shiftCalendarDay, toUtcIso, zonedWallClockToInstant } from "@/lib/utils/timezone";
import type { RawCalendarEvent } from "@/types/scheduling.types";

/**
 * ⚠️ TEMPORARY — DELETE WHEN THE n8n WEBHOOKS EXIST.
 *
 * Stand-in for the scheduling workflows while they are built in parallel
 * (`docs/features/scheduling.md` § Mientras no existan las URLs). It lets the
 * whole Next.js half — endpoints, hook, calendar, booking form — be finished
 * and clicked through today, against the exact contract agreed on 2026-08-05.
 *
 * Switching to the real thing is setting `N8N_AVAILABILITY_WEBHOOK_URL` and
 * `N8N_BOOKING_WEBHOOK_URL`. No code changes. This file then has no callers
 * and can be removed in one commit.
 *
 * **It cannot run in production.** `client.ts` only reaches this when the URL
 * is missing AND `NODE_ENV !== "production"`. A published site that invents
 * office hours and pretends to book is worse than one that says "call us".
 *
 * The data is DETERMINISTIC — derived from the date, never random — so the
 * calendar does not reshuffle on every reload, and reproducing a bug means
 * loading the same month again.
 */

/** Busy blocks are returned in BOTH shapes the contract accepts, alternating
 *  by day: raw Google objects on even days, flattened on odd ones. That keeps
 *  `normalizeBusyBlocks` honest against whichever shape the real workflow ends
 *  up sending — the mismatch we cannot discover any other way until it ships. */
function busyForDay(day: string): RawCalendarEvent[] {
  const date = parseCalendarDay(day);
  if (!date) return [];

  const at = (hour: number) =>
    zonedWallClockToInstant({ ...date, hour, minute: 0 }, BUSINESS_TIMEZONE);

  const useRawShape = date.day % 2 === 0;
  const block = (fromHour: number, toHour: number): RawCalendarEvent =>
    useRawShape
      ? {
          start: { dateTime: toUtcIso(at(fromHour)) },
          end: { dateTime: toUtcIso(at(toHour)) },
          status: "confirmed",
          transparency: "opaque",
        }
      : { start: toUtcIso(at(fromHour)), end: toUtcIso(at(toHour)), status: "confirmed" };

  // Every 7th day is fully blocked, and as an ALL-DAY event — the shape that
  // arrives without `dateTime` and causes a double booking if mishandled.
  if (date.day % 7 === 3) {
    return [
      {
        start: { date: day },
        end: { date: shiftCalendarDay(day, 1) },
        status: "confirmed",
      },
    ];
  }

  const events: RawCalendarEvent[] = [block(12, 13)];

  if (date.day % 3 === 0) events.push(block(9, 11));
  if (date.day % 5 === 0) events.push(block(15, 17));

  // Noise the normalizer must ignore: a cancelled event and a "Free" one. If
  // either ever starts blocking a slot, it shows up here first.
  events.push({ start: { dateTime: toUtcIso(at(14)) }, end: { dateTime: toUtcIso(at(15)) }, status: "cancelled" });
  events.push({ start: { dateTime: toUtcIso(at(16)) }, end: { dateTime: toUtcIso(at(17)) }, transparency: "transparent" });

  return events;
}

function mockAvailability(payload: unknown): RawCalendarEvent[] {
  const { timeMin, timeMax } = (payload ?? {}) as { timeMin?: string; timeMax?: string };
  if (!timeMin || !timeMax) return [];

  const start = new Date(timeMin);
  const end = new Date(timeMax);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const events: RawCalendarEvent[] = [];
  const lastDay = calendarDayOf(end, BUSINESS_TIMEZONE);

  for (
    let day = calendarDayOf(start, BUSINESS_TIMEZONE), guard = 0;
    guard < 400;
    day = shiftCalendarDay(day, 1), guard++
  ) {
    events.push(...busyForDay(day));
    if (day === lastDay) break;
  }

  return events;
}

/**
 * A fake Calendar event id, stable for the same slot so a double submit does
 * not look like two different bookings while developing.
 */
function mockBooking(payload: unknown): { eventId: string } {
  const { start_utc: startUtc } = (payload ?? {}) as { start_utc?: string };
  const suffix = (startUtc ?? Date.now().toString()).replace(/\D/g, "").slice(-12);

  return { eventId: `mock-evt-${suffix}` };
}

/**
 * An appointment 48 hours from now — far enough that the ≥24 h branch of the
 * policy is what shows by default, which is the screen worth looking at while
 * building. Shifting the clock is how the other branch gets exercised.
 *
 * Simulating a READ is not the same as simulating a payment: nothing here tells
 * anyone their money moved. That line is drawn in `mockN8nResponse`.
 */
function mockAppointment(payload: unknown): Record<string, unknown> {
  const { event_id: eventId } = (payload ?? {}) as { event_id?: string };
  const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    found: true,
    status: "confirmed",
    start_utc: toUtcIso(start),
    end_utc: toUtcIso(end),
    service_name: "Consultoría fiscal para extranjeros",
    service_slug: "consultoria-fiscal-extranjeros",
    lead_id: "00000000-0000-4000-8000-000000000000",
    full_name: "Ana Rivera (MOCK)",
    email: "ana@ejemplo.com",
    client_timezone: "America/Mexico_City",
    meeting_url: "https://meet.google.com/mock-aaaa-bbb",
    // Echoed so a wrong token in the URL is visible in dev instead of silently
    // showing the same appointment for every link.
    mock_event_id: eventId ?? "",
  };
}

/** Returns what the corresponding workflow would, or `null` if it has none. */
export function mockN8nResponse(webhook: string, payload: unknown): unknown {
  // Money is never mocked. A fake confirmation would mark an appointment as
  // paid without a payment, which is the one lie this codebase must not tell —
  // not even while developing. These two answer `null`, which every caller
  // already reads as "the workflow did not respond".
  if (webhook === "confirm" || webhook === "payments") {
    console.error(`[n8n] webhook "${webhook}" sin configurar — no se simula nada relacionado al pago`);
    return null;
  }

  console.warn(
    `[n8n] ⚠️ MOCK activo para "${webhook}" — falta su URL. Los horarios NO son reales.`,
  );

  if (webhook === "availability") return mockAvailability(payload);
  if (webhook === "booking") return mockBooking(payload);
  if (webhook === "appointment") return mockAppointment(payload);

  // Cancelling and asking for another time move a calendar event and send an
  // email — the same class of side effect `booking` already simulates, and no
  // money is involved: refunds are manual by design (FASE 9). Answering the
  // happy path is what lets the two buttons be clicked through locally.
  if (webhook === "cancel") return { cancelled: true };
  if (webhook === "reschedule") return { received: true };

  // Releasing an unpaid hold destroys nothing that was not going to expire on
  // its own, so the happy path is safe to simulate. It answers `released: true`
  // unconditionally BECAUSE the real guard is in the workflow, not here — a
  // mock that pretended to enforce "only tentative, only RESERVA SIN PAGAR"
  // would be inventing a protection the caller must never rely on this side.
  if (webhook === "release") return { released: true };

  return null;
}
