"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  addMonths,
  dayNumberOf,
  formatMonthLabel,
  startOfMonth,
  todayIn,
  weekdayOfCalendarDay,
  zonedWallClockToInstant,
  parseCalendarDay,
} from "@/lib/utils/timezone";
import type { AvailabilityCalendarProps } from "./AvailabilityCalendar.types";

/**
 * Month grid marking which days still have room.
 *
 * Renders what it is given and reports clicks — it never fetches
 * (Mandamiento II). `useAvailability` feeds it.
 *
 * Built from real `<button>`s rather than divs so the whole calendar is
 * reachable with Tab and Enter: this is the step before a payment, and a
 * keyboard user who cannot pick a day cannot buy.
 */

/** Monday first: the audience is Latin American and Spanish. */
const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/** Grid column for a day, with Monday in column 1 (`getUTCDay` puts Sunday 0). */
function gridColumn(day: string): number {
  const weekday = weekdayOfCalendarDay(day);

  return weekday === 0 ? 7 : weekday;
}

export function AvailabilityCalendar({
  month,
  days,
  selectedDay,
  loading,
  clientTimezone,
  onSelectDay,
  onChangeMonth,
}: AvailabilityCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthDate = parseCalendarDay(monthStart);
  const today = todayIn(clientTimezone);

  // A label needs an instant, and noon avoids any daylight-saving edge.
  const monthLabel = monthDate
    ? formatMonthLabel(
        zonedWallClockToInstant({ ...monthDate, hour: 12 }, clientTimezone),
        clientTimezone,
      )
    : month;

  // The previous month is pointless once it is entirely in the past.
  const canGoBack = addMonths(month, -1) >= startOfMonth(today);

  return (
    <section aria-label="Calendario de disponibilidad">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChangeMonth(addMonths(month, -1))}
          disabled={!canGoBack}
          aria-label="Mes anterior"
          className="rounded-card border border-border p-2 text-ink-muted transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <h3 className="font-serif text-base text-navy-900 first-letter:uppercase" aria-live="polite">
          {monthLabel}
        </h3>

        <button
          type="button"
          onClick={() => onChangeMonth(addMonths(month, 1))}
          aria-label="Mes siguiente"
          className="rounded-card border border-border p-2 text-ink-muted transition-colors hover:bg-surface-muted"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="mt-4 grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="py-1 text-center text-xs font-medium text-ink-muted"
          >
            {label}
          </span>
        ))}
      </div>

      <div className={cn("mt-1 grid grid-cols-7 gap-1", loading && "opacity-50")}>
        {days.map((entry, index) => {
          const hasRoom = entry.slots.length > 0;
          const isSelected = entry.day === selectedDay;
          const isToday = entry.day === today;

          return (
            <button
              key={entry.day}
              type="button"
              disabled={!hasRoom}
              onClick={() => onSelectDay(entry.day)}
              // Only the first square needs positioning; the rest follow.
              style={index === 0 ? { gridColumnStart: gridColumn(entry.day) } : undefined}
              aria-pressed={isSelected}
              aria-label={
                hasRoom
                  ? `${dayNumberOf(entry.day)}: ${entry.slots.length} ${entry.slots.length === 1 ? "horario disponible" : "horarios disponibles"}`
                  : `${dayNumberOf(entry.day)}: sin cupo`
              }
              className={cn(
                "relative aspect-square rounded-card border text-sm transition-colors",
                isSelected
                  ? "border-accent bg-accent font-medium text-white"
                  : hasRoom
                    ? "border-border bg-surface text-ink hover:border-accent hover:bg-surface-muted"
                    : "cursor-not-allowed border-transparent text-ink-muted/40",
                isToday && !isSelected && "border-gold",
              )}
            >
              {dayNumberOf(entry.day)}

              {hasRoom && !isSelected ? (
                <span
                  className="absolute inset-x-0 bottom-1.5 mx-auto h-1 w-1 rounded-full bg-accent"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
