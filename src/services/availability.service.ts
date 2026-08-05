import { BUSINESS_HOURS, BUSINESS_TIMEZONE, SCHEDULING } from "@/constants/business";
import {
  calendarDayOf,
  daysBetween,
  instantToZonedParts,
  parseCalendarDay,
  shiftCalendarDay,
  toUtcIso,
  zonedWallClockToInstant,
} from "@/lib/utils/timezone";
import type { CalendarDay } from "@/lib/utils/timezone";
import type {
  BusyBlock,
  DayAvailability,
  RawCalendarEvent,
  Slot,
} from "@/types/scheduling.types";

/**
 * Availability arithmetic — office hours minus what is taken.
 *
 * This module is PURE: no network, no clock of its own, no environment. `now`
 * is a parameter, not `new Date()`. That is what lets the same code answer
 * "what is free?" for the calendar and "is this still free?" a minute later at
 * booking time, with no chance of the two disagreeing.
 *
 * It is also where the reasoning of `docs/features/scheduling.md` lives: n8n
 * hands over Claudia's raw calendar and every business rule is applied here
 * (ADR-010). No language model takes part — availability is subtraction, and a
 * non-deterministic answer in the most fragile step of the funnel would be a
 * liability (ADR-005).
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** ISO strings that carry their own offset (`…Z` or `…±HH:MM`). */
const ZONED_ISO_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Reads one edge of an event into an instant.
 *
 * Handles the three shapes the contract accepts (`scheduling.md` § Contrato
 * exacto) plus the all-day case, which is the dangerous one: Google sends
 * `{ date: "2026-08-12" }` with NO `dateTime`, and code that only looks at
 * `dateTime` treats a blocked day as free — that is a double booking, not an
 * error someone would notice.
 *
 * Google's all-day `end.date` is already exclusive (the day AFTER the last
 * one), so midnight of that day is exactly the right end instant. No +1 here.
 */
function readEventEdge(
  value: RawCalendarEvent["start"] | RawCalendarEvent["end"],
): Date | null {
  if (typeof value === "string") return parseInstant(value);

  if (value && typeof value === "object") {
    if (typeof value.dateTime === "string") return parseInstant(value.dateTime);

    if (typeof value.date === "string") {
      const parsed = parseCalendarDay(value.date);
      if (!parsed) return null;

      return zonedWallClockToInstant({ ...parsed, hour: 0, minute: 0 }, BUSINESS_TIMEZONE);
    }
  }

  return null;
}

/**
 * Parses a timestamp coming from n8n.
 *
 * A string with an offset is unambiguous and safe to hand to `Date`. One
 * WITHOUT an offset is a wall clock, and the rule in `02-architecture.md`
 * exists precisely for it: `new Date("2026-08-12T09:00")` means "9 o'clock
 * wherever this process happens to run" — UTC on Vercel, something else on a
 * laptop. Those get read as the firm's local time instead, which is the only
 * interpretation that makes sense for Claudia's calendar.
 */
function parseInstant(value: string): Date | null {
  if (!value) return null;

  if (ZONED_ISO_PATTERN.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [datePart, timePart = "00:00"] = value.split("T");
  const day = parseCalendarDay(datePart ?? "");
  if (!day) return null;

  const [hour, minute] = timePart.split(":");

  return zonedWallClockToInstant(
    { ...day, hour: Number(hour) || 0, minute: Number(minute) || 0 },
    BUSINESS_TIMEZONE,
  );
}

/**
 * Turns whatever n8n returned into busy blocks, dropping what does not block.
 *
 * The three exclusions are documented in `scheduling.md` § Trampas de Google
 * Calendar so the workflow does not have to filter anything — it can return
 * the raw events and this is the only place that decides.
 */
export function normalizeBusyBlocks(events: readonly RawCalendarEvent[]): BusyBlock[] {
  const blocks: BusyBlock[] = [];

  for (const event of events) {
    // A cancelled event still comes back from Google for a while. Counting it
    // would block an hour that is actually free — lost sales, silently.
    if (event.status === "cancelled") continue;

    // "Shows as Free" in Google. Its own semantics say it does not take time.
    if (event.transparency === "transparent") continue;

    const start = readEventEdge(event.start);
    const end = readEventEdge(event.end);
    if (!start || !end || end.getTime() <= start.getTime()) continue;

    blocks.push({ startUtc: toUtcIso(start), endUtc: toUtcIso(end) });
  }

  return blocks;
}

function overlapsBusy(start: Date, end: Date, busy: readonly BusyBlock[]): boolean {
  const startMs = start.getTime();
  const endMs = end.getTime();

  return busy.some((block) => {
    const blockStart = new Date(block.startUtc).getTime();
    const blockEnd = new Date(block.endUtc).getTime();

    // Touching edges do not overlap: a 10:00 slot after a block ending at
    // 10:00 is free. `BUSINESS_HOURS.bufferMinutes` is deliberately NOT
    // applied here — see the note at the bottom of this file.
    return startMs < blockEnd && endMs > blockStart;
  });
}

export type AvailabilityInput = {
  /** First day to return, in the VISITOR's zone. Inclusive. */
  from: CalendarDay;
  /** Last day to return, in the VISITOR's zone. Inclusive. */
  to: CalendarDay;
  busy: readonly BusyBlock[];
  /** Injected, never read from the system clock — that is what keeps this pure. */
  now: Date;
  durationMinutes: number;
  clientTimeZone: string;
};

/**
 * Office hours minus busy blocks, grouped by the visitor's calendar days.
 *
 * Every day in `[from, to]` comes back, including the full ones with an empty
 * `slots` array: the calendar grid has to render those squares as "sin cupo",
 * and a missing key would be indistinguishable from a day out of range.
 */
export function buildAvailability(input: AvailabilityInput): DayAvailability[] {
  const { from, to, busy, now, durationMinutes, clientTimeZone } = input;

  const byDay = new Map<CalendarDay, Slot[]>();
  for (let day = from; daysBetween(day, to) >= 0; day = shiftCalendarDay(day, 1)) {
    byDay.set(day, []);
  }

  const earliestStart = new Date(now.getTime() + SCHEDULING.minNoticeHours * HOUR_MS);
  const lastBookableDay = shiftCalendarDay(
    calendarDayOf(now, BUSINESS_TIMEZONE),
    SCHEDULING.maxDaysAhead,
  );

  // Walk the firm's calendar one day wider on each side than what was asked
  // for: the visitor's Monday can hold slots belonging to the firm's Sunday or
  // Tuesday once the zones are far enough apart.
  const firstBusinessDay = shiftCalendarDay(from, -1);
  const lastBusinessDay = shiftCalendarDay(to, 1);

  for (
    let day = firstBusinessDay;
    daysBetween(day, lastBusinessDay) >= 0;
    day = shiftCalendarDay(day, 1)
  ) {
    const date = parseCalendarDay(day);
    if (!date) continue;

    if (daysBetween(day, lastBookableDay) < 0) continue;

    // Noon, not midnight: reading the weekday from the middle of the day is
    // immune to any daylight-saving shift happening at 00:00.
    const noon = zonedWallClockToInstant({ ...date, hour: 12 }, BUSINESS_TIMEZONE);
    const { weekday } = instantToZonedParts(noon, BUSINESS_TIMEZONE);

    if (!(BUSINESS_HOURS.workingDays as readonly number[]).includes(weekday)) continue;

    const openMinutes = BUSINESS_HOURS.startHour * 60;
    const closeMinutes = BUSINESS_HOURS.endHour * 60;

    for (
      let minutes = openMinutes;
      // The session must FINISH inside office hours, not merely start there.
      minutes + durationMinutes <= closeMinutes;
      minutes += BUSINESS_HOURS.slotIntervalMinutes
    ) {
      const start = zonedWallClockToInstant(
        { ...date, hour: Math.floor(minutes / 60), minute: minutes % 60 },
        BUSINESS_TIMEZONE,
      );
      const end = new Date(start.getTime() + durationMinutes * MINUTE_MS);

      if (start.getTime() < earliestStart.getTime()) continue;
      if (overlapsBusy(start, end, busy)) continue;

      // Grouped by the visitor's day, which is the grid they are looking at.
      const visitorDay = calendarDayOf(start, clientTimeZone);
      const slots = byDay.get(visitorDay);
      if (!slots) continue;

      slots.push({ startUtc: toUtcIso(start), endUtc: toUtcIso(end) });
    }
  }

  return [...byDay.entries()]
    .map(([day, slots]) => ({
      day,
      slots: slots.toSorted((a, b) => a.startUtc.localeCompare(b.startUtc)),
    }))
    .toSorted((a, b) => a.day.localeCompare(b.day));
}

/** First day with room, so the UI opens on a useful square. `null` if full. */
export function findNextAvailableDay(days: readonly DayAvailability[]): CalendarDay | null {
  return days.find((day) => day.slots.length > 0)?.day ?? null;
}

/**
 * Whether a slot can still be booked, right now.
 *
 * Built ON TOP of `buildAvailability` on purpose. The server must not trust
 * what the browser says is free (`scheduling.md` § Restricciones), and the
 * cheapest way to guarantee that the check agrees with what was displayed is
 * to make it literally the same computation — a second implementation would
 * drift the first time office hours change.
 */
export function isSlotBookable(input: {
  startUtc: string;
  busy: readonly BusyBlock[];
  now: Date;
  durationMinutes: number;
}): boolean {
  const start = new Date(input.startUtc);
  if (Number.isNaN(start.getTime())) return false;

  const day = calendarDayOf(start, BUSINESS_TIMEZONE);

  const days = buildAvailability({
    from: day,
    to: day,
    busy: input.busy,
    now: input.now,
    durationMinutes: input.durationMinutes,
    clientTimeZone: BUSINESS_TIMEZONE,
  });

  return days.some((entry) =>
    entry.slots.some((slot) => new Date(slot.startUtc).getTime() === start.getTime()),
  );
}

/**
 * ⚠️ `BUSINESS_HOURS.bufferMinutes` is declared but NOT used here, and that is
 * a decision, not an oversight (`scheduling.md` § Bloque C, decisión 6).
 *
 * It says "gap between appointments" and is set to 15, while
 * `slotIntervalMinutes` is 60 and every service lasts 60 minutes. The two do
 * not fit: hourly appointments an hour long leave no gap to put it in.
 * Applying it literally would make a 9:00 booking invalidate the 10:00 one and
 * cut Claudia's day from 8 openings to 4 — a large business change hiding
 * inside an arithmetic detail.
 *
 * If the firm does want a real break between consultations, the fix is to
 * shorten the session to 45 minutes inside the 60-minute slot (one number in
 * the catalog), not to subtract time here. Pending the client's answer.
 */
