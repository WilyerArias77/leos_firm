"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CircleCheckBig, Clock, Mail, RotateCw } from "lucide-react";
import { PaymentPanel } from "@/components/features/payments/PaymentPanel";
import { AvailabilityCalendar } from "@/components/features/scheduling/AvailabilityCalendar";
import { BookingForm } from "@/components/features/scheduling/BookingForm";
import { SlotPicker } from "@/components/features/scheduling/SlotPicker";
import { TimezoneNotice } from "@/components/features/scheduling/TimezoneNotice";
import { Button } from "@/components/ui/Button";
import { BUSINESS_TIMEZONE, COMPANY } from "@/constants/business";
import { useSlotRelease } from "@/hooks/useSlotRelease";
import { detectClientTimeZone, formatDayInZone, formatTimeInZone, todayIn } from "@/lib/utils/timezone";
import { useAvailability } from "@/hooks/useAvailability";
import { createAppointment } from "@/services/appointment.service";
import { getStoredContact, getStoredLeadId } from "@/services/lead.service";
import type { CalendarDay } from "@/lib/utils/timezone";
import type { PaymentOutcome } from "@/components/features/payments/PaymentPanel";
import type { Service } from "@/types/content.types";
import type { StoredContact } from "@/services/lead.service";
import type { AppointmentHold } from "@/types/scheduling.types";
import type { BookingFlowProps } from "./BookingFlow.types";
import type { BookingFormValues } from "@/components/features/scheduling/BookingForm";


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

  // Kept from the submitted form rather than read back from storage: Square's
  // 3-D Secure challenge needs a billing contact, and these are the values the
  // visitor actually confirmed.
  const [payer, setPayer] = useState<{ fullName: string; email: string } | null>(null);

  // `null` until the payment resolves. Set by `PaymentPanel`, which is the only
  // thing that knows whether Square took the money.
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);

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

    setPayer({ fullName: values.fullName, email: values.email });
    setHold(response.hold);
  }

  if (!clientTimezone || !month) {
    return (
      <div className="h-96 animate-pulse rounded-card bg-surface-muted" aria-hidden="true" />
    );
  }

  if (hold && outcome) {
    return <PaidAppointment hold={hold} serviceName={service.name} outcome={outcome} />;
  }

  if (hold && leadId && payer) {
    return (
      <HeldSlot
        hold={hold}
        service={service}
        leadId={leadId}
        payer={payer}
        onOutcome={setOutcome}
      />
    );
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
              href={`mailto:${COMPANY.email}`}
              className="inline-flex items-center gap-2 rounded-card px-4 py-2.5 text-sm text-accent underline underline-offset-4"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Agendar por correo · {COMPANY.email}
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
 * The slot is held, the payment is not made yet.
 *
 * It does not congratulate anyone: no appointment exists until Square confirms
 * the payment (`context.md` §8), so this screen states what is still owed and
 * puts the card form right underneath it.
 */
function HeldSlot({
  hold,
  service,
  leadId,
  payer,
  onOutcome,
}: {
  hold: AppointmentHold;
  service: Service;
  leadId: string;
  payer: { fullName: string; email: string };
  onOutcome: (outcome: PaymentOutcome) => void;
}) {
  const start = new Date(hold.startUtc);
  const showBothZones = hold.clientTimezone !== hold.businessTimezone;

  // Frees the hour the moment they leave, instead of making the next visitor
  // wait out `SLOT_HOLD_MINUTES`. `active` is true for the whole time this
  // screen is up — including after a declined card, which deliberately does NOT
  // release: the client's spec asks for a retry and a decline is normal.
  const { release } = useSlotRelease({ eventId: hold.eventId, active: true });

  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-accent uppercase">
        <Clock className="h-4 w-4" aria-hidden="true" />
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
        Apartamos este horario para tu sesión de{" "}
        <strong className="text-ink">{service.name}</strong>. La cita queda confirmada cuando
        completes el pago.
      </p>

      <p className="mt-4 rounded-card bg-surface-muted p-4 text-xs leading-relaxed text-ink-muted">
        Para confirmar la cita es necesario realizar el pago, recuerda que el espacio queda separado
        por poco
      </p>

      {hold.crmDelivery === "failed" ? (
        <p className="mt-3 text-xs leading-relaxed text-warning">
          Tu horario quedó apartado, pero no pudimos registrar tus datos automáticamente. Llámanos
          para confirmarlos.
        </p>
      ) : null}

      <PaymentPanel
        service={service}
        leadId={leadId}
        eventId={hold.eventId}
        payer={payer}
        onOutcome={onOutcome}
      />

      {/* The explicit way out. Without it the only way to free the hour early
          is closing the tab, and someone who has decided not to continue
          deserves a button instead of a guess. */}
      <button
        type="button"
        onClick={release}
        className="mt-4 w-full rounded-card px-4 py-2.5 text-xs text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
      >
        Prefiero no continuar y liberar este horario
      </button>
    </div>
  );
}

/**
 * The money cleared. What this screen may and may not claim:
 *
 * - `confirmed` — Square says the payment went through, so the appointment is
 *   confirmed and the confirmation email is on its way (the webhook and WF3 do
 *   both, out of band — ADR-002).
 * - `processing` — the charge was accepted but we stopped asking whether it
 *   cleared. It does NOT say the appointment is confirmed, because we do not
 *   know that yet. The email arrives either way, which is what it says instead.
 *
 * **The Meet link is not shown here.** It travels in the confirmation email,
 * which is where the client will look for it the day of the appointment — and it
 * saves this screen from having to read the calendar back.
 */
function PaidAppointment({
  hold,
  serviceName,
  outcome,
}: {
  hold: AppointmentHold;
  serviceName: string;
  outcome: PaymentOutcome;
}) {
  const start = new Date(hold.startUtc);
  const showBothZones = hold.clientTimezone !== hold.businessTimezone;
  const confirmed = outcome === "confirmed";

  return (
    <div className="rounded-card border border-success/30 bg-success/5 p-6">
      <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-success uppercase">
        <CircleCheckBig className="h-4 w-4" aria-hidden="true" />
        {confirmed ? "Cita confirmada" : "Pago recibido"}
      </p>

      <h2 className="mt-3 font-serif text-xl text-navy-900">
        {confirmed
          ? "Tu cita está confirmada"
          : "Estamos confirmando tu cita"}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-ink">
        <span className="first-letter:uppercase">
          {formatDayInZone(start, hold.clientTimezone)}
        </span>{" "}
        a las {formatTimeInZone(start, hold.clientTimezone)} · {serviceName}
      </p>

      {showBothZones ? (
        <p className="mt-1 text-sm text-ink-muted">
          {formatTimeInZone(start, hold.businessTimezone)} en San Antonio
        </p>
      ) : null}

      <p className="mt-4 flex items-start gap-2 rounded-card bg-surface p-4 text-sm leading-relaxed text-ink-muted">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        {confirmed
          ? "Recibirás un correo con la confirmación de tu cita y el enlace de la videollamada. Revisa también la carpeta de correo no deseado."
          : "Recibirás un correo con la confirmación de tu cita y el enlace de la videollamada en cuanto termine de procesarse. Revisa también la carpeta de correo no deseado."}
      </p>

      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        ¿Alguna duda? Escríbenos a{" "}
        <a href={`mailto:${COMPANY.email}`} className="inline-flex items-center gap-1 text-accent underline underline-offset-4">
          <Mail className="h-3 w-3" aria-hidden="true" />
          {COMPANY.email}
        </a>
      </p>
    </div>
  );
}
