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

/** Returns what the corresponding workflow would, or `null` if it has none. */
export function mockN8nResponse(webhook: string, payload: unknown): unknown {
  console.warn(
    `[n8n] ⚠️ MOCK activo para "${webhook}" — falta su URL. Los horarios NO son reales.`,
  );

  if (webhook === "availability") return mockAvailability(payload);
  if (webhook === "booking") return mockBooking(payload);

  return null;
}
