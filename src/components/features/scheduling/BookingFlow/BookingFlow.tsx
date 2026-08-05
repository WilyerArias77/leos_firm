"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CircleCheckBig, Phone, RotateCw } from "lucide-react";
import { AvailabilityCalendar } from "@/components/features/scheduling/AvailabilityCalendar";
import { BookingForm } from "@/components/features/scheduling/BookingForm";
import { SlotPicker } from "@/components/features/scheduling/SlotPicker";
import { TimezoneNotice } from "@/components/features/scheduling/TimezoneNotice";
import { Button } from "@/components/ui/Button";
import { BUSINESS_TIMEZONE, COMPANY } from "@/constants/business";
import { detectClientTimeZone, formatDayInZone, formatTimeInZone, todayIn } from "@/lib/utils/timezone";
import { useAvailability } from "@/hooks/useAvailability";
import { createAppointment } from "@/services/appointment.service";
import { getStoredContact, getStoredLeadId } from "@/services/lead.service";
import type { CalendarDay } from "@/lib/utils/timezone";
import type { StoredContact } from "@/services/lead.service";
import type { AppointmentHold } from "@/types/scheduling.types";
import type { BookingFlowProps } from "./BookingFlow.types";
import type { BookingFormValues } from "@/components/features/scheduling/BookingForm";

const PHONE_HREF = `tel:+1${COMPANY.phone.replace(/\D/g, "")}`;

/** Never fires: the snapshot is a constant, we only need server vs. client. */
const subscribeToNothing = () => () => {};

/**
 * Drives the whole booking screen: month → day → hour → confirm.
 *
 * It owns the state and delegates every piece of rendering. All the network
 * goes through `useAvailability` and `appointment.service.ts`, so no component
 * below this one knows an API exists (Mandamiento II).
 */
export function BookingFlow({ service }: BookingFlowProps) {
  // The visitor's zone, their stored contact and their lead id only exist in
  // the browser. Reading them in an effect would mean a second render for
  // every one of them; `useSyncExternalStore` lets the first render already
  // know whether we are hydrated, so they can simply be derived below.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  const clientTimezone = hydrated ? detectClientTimeZone() : null;

  // `null` means "not chosen yet", so today's month is the fallback rather
  // than initial state — no effect needed to seed it.
  const [chosenMonth, setChosenMonth] = useState<CalendarDay | null>(null);
  const month = chosenMonth ?? (clientTimezone ? todayIn(clientTimezone) : null);

  // Read once, through a lazy initializer. Safe against hydration mismatches
  // because neither value reaches the first render's markup: the form only
  // appears after a slot is picked, and the lead id is never displayed at all.
  // Both read `null` on the server and their real value in the browser.
  const [contact] = useState<StoredContact | null>(() => getStoredContact());
  const [leadId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;

    // A visitor who skipped the diagnosis has no row yet. Minting an id here
    // opens one for them, and the appointment stage writes their contact too.
    return getStoredLeadId() ?? crypto.randomUUID();
  });

  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | undefined>();
  const [hold, setHold] = useState<AppointmentHold | null>(null);

  const availability = useAvailability({
    month: month ?? "1970-01-01",
    timeZone: clientTimezone ?? BUSINESS_TIMEZONE,
    serviceSlug: service.slug,
  });

  const slotsForDay = useMemo(
    () => availability.days.find((day) => day.day === selectedDay)?.slots ?? [],
    [availability.days, selectedDay],
  );

  async function handleSubmit(values: BookingFormValues) {
    if (!selectedSlot || !clientTimezone || !leadId) return;

    setSubmitting(true);
    setError(null);
    setFieldErrors(undefined);

    const response = await createAppointment({
      leadId,
      serviceSlug: service.slug,
      startUtc: selectedSlot,
      clientTimezone,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      // The schema demands `true`; an unticked box fails validation and the
      // message lands on the checkbox, which is where the visitor is looking.
      policyAccepted: values.policyAccepted as true,
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      setFieldErrors(response.fieldErrors);

      // Someone took the slot mid-form. Drop the selection and refresh, so the
      // grid shows the truth instead of the hour that just disappeared.
      if (response.alternatives) {
        setSelectedSlot(null);
        availability.refresh();
      }

      return;
    }

    setHold(response.hold);
  }

  if (!clientTimezone || !month) {
    return (
      <div className="h-96 animate-pulse rounded-card bg-surface-muted" aria-hidden="true" />
    );
  }

  if (hold) {
    return <HeldSlot hold={hold} serviceName={service.name} />;
  }

  return (
    <div className="space-y-6">
      <TimezoneNotice clientTimezone={clientTimezone} />

      {availability.error ? (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{availability.error}</p>

          <div className="mt-3 flex flex-wrap gap-3">
            <Button type="button" variant="secondary" size="md" onClick={availability.refresh}>
              <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>

            <a
              href={PHONE_HREF}
              className="inline-flex items-center gap-2 rounded-card px-4 py-2.5 text-sm text-accent underline underline-offset-4"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Agendar por teléfono · {COMPANY.phone}
            </a>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
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

      {selectedSlot ? (
        <BookingForm
          startUtc={selectedSlot}
          clientTimezone={clientTimezone}
          contact={contact}
          submitting={submitting}
          error={error}
          fieldErrors={fieldErrors}
          onSubmit={(values) => void handleSubmit(values)}
        />
      ) : null}
    </div>
  );
}

/**
 * The slot is held, the payment is not made.
 *
 * Says so plainly instead of congratulating anyone: no appointment exists
 * until Square confirms (`context.md` §8), and the payment screen is FASE 6.
 * Claiming a confirmed booking here would be the site lying about what it did.
 */
function HeldSlot({ hold, serviceName }: { hold: AppointmentHold; serviceName: string }) {
  const start = new Date(hold.startUtc);
  const showBothZones = hold.clientTimezone !== hold.businessTimezone;

  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-accent uppercase">
        <CircleCheckBig className="h-4 w-4" aria-hidden="true" />
        Horario apartado
      </p>

      <h2 className="mt-3 font-serif text-xl text-navy-900 first-letter:uppercase">
        {formatDayInZone(start, hold.clientTimezone)} a las{" "}
        {formatTimeInZone(start, hold.clientTimezone)}
      </h2>

      {showBothZones ? (
        <p className="mt-1 text-sm text-ink-muted">
          {formatTimeInZone(start, hold.businessTimezone)} en San Antonio
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        Apartamos este horario para tu sesión de <strong className="text-ink">{serviceName}</strong>.
        La cita queda confirmada cuando completes el pago.
      </p>

      <p className="mt-4 rounded-card bg-surface-muted p-4 text-xs leading-relaxed text-ink-muted">
        El pago en línea todavía no está disponible en el sitio. Llámanos para completarlo y
        confirmar tu cita — tenemos tu horario apartado por unos minutos.
      </p>

      {hold.crmDelivery === "failed" ? (
        <p className="mt-3 text-xs leading-relaxed text-warning">
          Tu horario quedó apartado, pero no pudimos registrar tus datos automáticamente. Llámanos
          para confirmarlos.
        </p>
      ) : null}

      <a
        href={PHONE_HREF}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-card bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        Llamar y confirmar · {COMPANY.phone}
      </a>
    </div>
  );
}
