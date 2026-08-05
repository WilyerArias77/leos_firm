import { TZDate } from "@date-fns/tz";
import { BUSINESS_TIMEZONE } from "@/constants/business";

/**
 * Time zone conversion — the single door for every date calculation
 * (`docs/features/scheduling.md` § Reglas de husos horarios).
 *
 * Two rules the whole scheduling feature rests on:
 *
 * 1. Slots are CALCULATED in `America/Chicago` (the firm's office hours) and
 *    PRESENTED in the visitor's zone. Both zones are always explicit — no
 *    function here reads the server's local zone, which on Vercel is UTC and
 *    on a laptop is whatever the laptop says.
 * 2. `new Date(string)` is never called on a wall-clock string. Parsing
 *    "2026-08-12T09:00" without a zone means "9 in the runtime's zone", which
 *    silently differs between a developer's machine and production.
 *
 * Arithmetic goes through `TZDate`; presentation through `Intl.DateTimeFormat`.
 * The split is deliberate: `Intl` is built in, so no locale data reaches the
 * client bundle. Same reasoning as `formatCurrency.ts`.
 */

/** A calendar day, `YYYY-MM-DD`. Carries no zone: it is a square on a grid. */
export type CalendarDay = string;

/** Wall-clock fields as read on a clock hanging in a given time zone. */
export type ZonedParts = {
  year: number;
  /** 0-11, like `Date.prototype.getMonth`. */
  monthIndex: number;
  day: number;
  /** 0 = Sunday … 6 = Saturday, to compare against `BUSINESS_HOURS.workingDays`. */
  weekday: number;
  hour: number;
  minute: number;
};

const CALENDAR_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Whether the runtime knows this IANA zone.
 *
 * The visitor's zone arrives as a query parameter, so it is untrusted input:
 * handing an unknown string to `Intl` throws a `RangeError` and would turn a
 * typo into a 500.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;

  try {
    new Intl.DateTimeFormat("es", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The candidate zone if the runtime knows it, the firm's zone otherwise. */
export function resolveTimeZone(candidate: string | null | undefined): string {
  if (candidate && isValidTimeZone(candidate)) return candidate;
  return BUSINESS_TIMEZONE;
}

/**
 * The zone of the browser running this code.
 *
 * Returns the firm's zone on the server, where there is no visitor to ask.
 */
export function detectClientTimeZone(): string {
  if (typeof Intl === "undefined") return BUSINESS_TIMEZONE;

  return resolveTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/**
 * Serializes an instant as UTC (`…Z`).
 *
 * ⚠️ This function exists because of a real trap: `TZDate` OVERRIDES
 * `toISOString()` and returns the zoned offset form —
 * `"2026-08-12T09:00:00.000-05:00"` instead of `"2026-08-12T14:00:00.000Z"`.
 * Both name the same instant, but every payload leaving this app is documented
 * as UTC, and n8n and Google would receive something else than the contract
 * says. Rebuilding a plain `Date` from the timestamp drops the zone.
 *
 * Never call `.toISOString()` on a `TZDate` — call this.
 */
export function toUtcIso(instant: Date): string {
  return new Date(instant.getTime()).toISOString();
}

/**
 * The instant at which a wall clock in `timeZone` reads the given fields.
 *
 * Daylight saving is not computed here: `TZDate` resolves it from the IANA
 * database, so 9:00 in Chicago is 14:00 UTC in August and 15:00 UTC in
 * January without this file knowing that March and November exist.
 *
 * Returns a plain `Date` on purpose — callers get an instant, not something
 * that formats itself back into a zone they did not ask for.
 */
export function zonedWallClockToInstant(
  parts: { year: number; monthIndex: number; day: number; hour: number; minute?: number },
  timeZone: string,
): Date {
  const zoned = new TZDate(
    parts.year,
    parts.monthIndex,
    parts.day,
    parts.hour,
    parts.minute ?? 0,
    0,
    0,
    timeZone,
  );

  return new Date(zoned.getTime());
}

/** What a clock in `timeZone` reads at this instant. */
export function instantToZonedParts(instant: Date, timeZone: string): ZonedParts {
  const zoned = new TZDate(instant.getTime(), timeZone);

  return {
    year: zoned.getFullYear(),
    monthIndex: zoned.getMonth(),
    day: zoned.getDate(),
    weekday: zoned.getDay(),
    hour: zoned.getHours(),
    minute: zoned.getMinutes(),
  };
}

/**
 * Which calendar day this instant falls on, as seen from `timeZone`.
 *
 * The zone is what makes this non-obvious: a slot at 17:00 in San Antonio is
 * already the next morning in Tokyo, and the visitor's calendar must show it
 * on the square they would expect.
 */
export function calendarDayOf(instant: Date, timeZone: string): CalendarDay {
  const { year, monthIndex, day } = instantToZonedParts(instant, timeZone);

  return formatCalendarDay(year, monthIndex, day);
}

export function formatCalendarDay(year: number, monthIndex: number, day: number): CalendarDay {
  const month = String(monthIndex + 1).padStart(2, "0");

  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

/** `"2026-08-12"` → fields, or `null` when it is not a calendar day. */
export function parseCalendarDay(
  value: string,
): { year: number; monthIndex: number; day: number } | null {
  const match = CALENDAR_DAY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  // Rejects "2026-02-31": `Date.UTC` rolls it over to March, so a round trip
  // that changes the value proves the date never existed.
  const roundTrip = new Date(Date.UTC(year, monthIndex, day));

  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== monthIndex ||
    roundTrip.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, monthIndex, day };
}

/**
 * Moves a calendar day forward or back.
 *
 * Pure grid arithmetic done in UTC, with no zone involved — adding a day to a
 * square on a calendar must never gain or lose an hour because a daylight
 * saving change happened to fall in between.
 */
export function shiftCalendarDay(value: CalendarDay, deltaDays: number): CalendarDay {
  const parsed = parseCalendarDay(value);
  if (!parsed) return value;

  const shifted = new Date(Date.UTC(parsed.year, parsed.monthIndex, parsed.day + deltaDays));

  return formatCalendarDay(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: CalendarDay, to: CalendarDay): number {
  const start = parseCalendarDay(from);
  const end = parseCalendarDay(to);
  if (!start || !end) return 0;

  const startMs = Date.UTC(start.year, start.monthIndex, start.day);
  const endMs = Date.UTC(end.year, end.monthIndex, end.day);

  return Math.round((endMs - startMs) / 86_400_000);
}

/** Today, as seen from a given zone. The visitor's today, not the server's. */
export function todayIn(timeZone: string): CalendarDay {
  return calendarDayOf(new Date(), timeZone);
}

/**
 * Calendar-grid helpers. Pure square arithmetic with no zone involved — they
 * move around a wall calendar, which is exactly what the month view is.
 */

export function startOfMonth(value: CalendarDay): CalendarDay {
  const parsed = parseCalendarDay(value);
  if (!parsed) return value;

  return formatCalendarDay(parsed.year, parsed.monthIndex, 1);
}

export function endOfMonth(value: CalendarDay): CalendarDay {
  const parsed = parseCalendarDay(value);
  if (!parsed) return value;

  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(parsed.year, parsed.monthIndex + 1, 0));

  return formatCalendarDay(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
}

/** Same day number in another month, clamped when that month is shorter. */
export function addMonths(value: CalendarDay, delta: number): CalendarDay {
  const parsed = parseCalendarDay(value);
  if (!parsed) return value;

  const shifted = new Date(Date.UTC(parsed.year, parsed.monthIndex + delta, 1));

  return formatCalendarDay(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
}

/** 0 = Sunday … 6 = Saturday, for laying out the grid. */
export function weekdayOfCalendarDay(value: CalendarDay): number {
  const parsed = parseCalendarDay(value);
  if (!parsed) return 0;

  return new Date(Date.UTC(parsed.year, parsed.monthIndex, parsed.day)).getUTCDay();
}

/** Just the day number, for painting the square. */
export function dayNumberOf(value: CalendarDay): number {
  return parseCalendarDay(value)?.day ?? 0;
}

/**
 * Presentation. All of it goes through `Intl` in `es-MX`: the UI is in Spanish
 * (Mandamiento XI) and the audience is Latin American.
 */
const UI_LOCALE = "es-MX";

/** `"9:00 a.m."` — the visitor picks an hour, never a date-time. */
export function formatTimeInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(UI_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(instant);
}

/** `"miércoles 12 de agosto"` — for the confirmation line. */
export function formatDayInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(UI_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(instant);
}

/** `"agosto de 2026"` — the calendar header. */
export function formatMonthLabel(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(UI_LOCALE, {
    month: "long",
    year: "numeric",
    timeZone,
  }).format(instant);
}

/**
 * `"CDT"`, `"GMT-5"` — shown next to every hour so nobody books at the wrong
 * time believing the site guessed their zone right.
 */
export function timeZoneAbbreviation(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(instant);

  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}
