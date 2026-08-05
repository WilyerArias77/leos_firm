"use client";

import { BUSINESS_TIMEZONE } from "@/constants/business";
import { cn } from "@/lib/utils/cn";
import { formatDayInZone, formatTimeInZone, timeZoneAbbreviation } from "@/lib/utils/timezone";
import type { SlotPickerProps } from "./SlotPicker.types";

/**
 * The hours free on the chosen day, in the visitor's zone.
 *
 * Each button shows the firm's time underneath whenever the two zones differ.
 * Showing both is a rule of the feature, not a nicety
 * (`docs/features/scheduling.md`): a client in Madrid booking "9:00" needs to
 * see that Claudia will be joining at 2:00 in the afternoon her time, or the
 * first sign of the mismatch is a missed appointment.
 */
export function SlotPicker({
  day,
  slots,
  selectedSlot,
  clientTimezone,
  onSelectSlot,
}: SlotPickerProps) {
  const showBothZones = clientTimezone !== BUSINESS_TIMEZONE;

  if (!day) {
    return (
      <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-ink-muted">
        Elige un día en el calendario para ver los horarios disponibles.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-ink-muted">
        Ese día ya no tiene cupo. Prueba con otro.
      </p>
    );
  }

  const firstSlotDate = new Date(slots[0].startUtc);

  return (
    <section aria-label="Horarios disponibles">
      <h3 className="font-sans text-sm font-medium text-navy-900 first-letter:uppercase">
        {formatDayInZone(firstSlotDate, clientTimezone)}
      </h3>

      <p className="mt-1 text-xs text-ink-muted">
        Horarios en {timeZoneAbbreviation(firstSlotDate, clientTimezone)}
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => {
          const start = new Date(slot.startUtc);
          const isSelected = slot.startUtc === selectedSlot;

          return (
            <li key={slot.startUtc}>
              <button
                type="button"
                onClick={() => onSelectSlot(slot.startUtc)}
                aria-pressed={isSelected}
                className={cn(
                  "w-full rounded-card border px-3 py-2.5 text-center transition-colors",
                  isSelected
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface text-ink hover:border-accent hover:bg-surface-muted",
                )}
              >
                <span className="block text-sm font-medium">
                  {formatTimeInZone(start, clientTimezone)}
                </span>

                {showBothZones ? (
                  <span
                    className={cn(
                      "mt-0.5 block text-[11px]",
                      isSelected ? "text-white/80" : "text-ink-muted",
                    )}
                  >
                    {formatTimeInZone(start, BUSINESS_TIMEZONE)} en San Antonio
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
