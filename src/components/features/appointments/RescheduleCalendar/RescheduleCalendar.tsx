"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { AvailabilityCalendar } from "@/components/features/scheduling/AvailabilityCalendar";
import { SlotPicker } from "@/components/features/scheduling/SlotPicker";
import { Button } from "@/components/ui/Button";
import { BUSINESS_TIMEZONE } from "@/constants/business";
import { useAvailability } from "@/hooks/useAvailability";
import { formatDayInZone, formatTimeInZone, todayIn } from "@/lib/utils/timezone";
import { rescheduleAppointmentByToken } from "@/services/appointment.service";
import type { CalendarDay } from "@/lib/utils/timezone";
import type { RescheduleCalendarProps } from "./RescheduleCalendar.types";

/**
 * Picking a new hour for an appointment that already exists (ADR-019).
 *
 * It is the booking calendar again — the same `useAvailability`, the same two
 * components — and that repetition is the point: a second grid would drift from
 * the first the moment office hours change, and then the page would offer hours
 * the booking flow does not believe in.
 *
 * What it does NOT do is decide anything. It shows what the server says is free
 * and asks the server to move the appointment; every rule — the 24 h window,
 * the reschedule limit, whether the hour is still there a second later — is
 * re-applied server-side and can overrule this screen (Mandamiento II).
 */
export function RescheduleCalendar({
  token,
  currentStartUtc,
  clientTimezone,
  serviceSlug,
  onMoved,
  onCancel,
}: RescheduleCalendarProps) {
  const [chosenMonth, setChosenMonth] = useState<CalendarDay | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const month = chosenMonth ?? todayIn(clientTimezone);

  const availability = useAvailability({
    month,
    timeZone: clientTimezone,
    serviceSlug: serviceSlug || undefined,
  });

  const slotsForDay = useMemo(
    () => availability.days.find((day) => day.day === selectedDay)?.slots ?? [],
    [availability.days, selectedDay],
  );

  const current = new Date(currentStartUtc);

  async function handleConfirm() {
    if (!selectedSlot) return;

    setSubmitting(true);
    setError(null);

    const result = await rescheduleAppointmentByToken(token, selectedSlot);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);

      // The hour went while they were choosing. Dropping the selection forces a
      // fresh pick instead of letting them press the same dead slot again, and
      // `refresh()` redraws the day so the gone hour visibly disappears.
      if (result.alternatives) {
        setSelectedSlot(null);
        availability.refresh();
      }

      return;
    }

    onMoved(result.movedTo);
  }

  return (
    <div className="mt-8 rounded-card border border-border bg-surface-muted p-5">
      <h2 className="flex items-center gap-2 font-serif text-lg text-navy-900">
        <CalendarClock className="h-5 w-5 text-accent" aria-hidden="true" />
        Elige tu horario nuevo
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Tu cita está ahora el{" "}
        <strong className="font-medium text-ink">
          {formatDayInZone(current, clientTimezone)} a las{" "}
          {formatTimeInZone(current, clientTimezone)}
        </strong>
        . Elige otro momento y la movemos al instante — sin costo y conservando el mismo enlace de
        la reunión.
      </p>

      {availability.error ? (
        <p
          role="alert"
          className="mt-4 rounded-card border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink"
        >
          {availability.error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <AvailabilityCalendar
          month={month}
          days={availability.days}
          selectedDay={selectedDay}
          loading={availability.loading}
          clientTimezone={clientTimezone}
          onSelectDay={(day) => {
            setSelectedDay(day);
            setSelectedSlot(null);
          }}
          onChangeMonth={(next) => {
            setChosenMonth(next);
            setSelectedDay(null);
            setSelectedSlot(null);
          }}
        />

        <SlotPicker
          day={selectedDay}
          slots={slotsForDay}
          selectedSlot={selectedSlot}
          clientTimezone={clientTimezone}
          onSelectSlot={setSelectedSlot}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-card border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" onClick={handleConfirm} disabled={!selectedSlot || submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
          )}
          {submitting ? "Moviendo tu cita…" : "Confirmar el cambio"}
        </Button>

        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Volver
        </Button>
      </div>

      {clientTimezone !== BUSINESS_TIMEZONE ? (
        <p className="mt-4 text-xs text-ink-muted">
          Los horarios se muestran en tu zona ({clientTimezone}).
        </p>
      ) : null}
    </div>
  );
}
