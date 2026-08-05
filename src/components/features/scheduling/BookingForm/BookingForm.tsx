"use client";

import { useState } from "react";
import { AlertCircle, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BUSINESS_TIMEZONE, CANCELLATION_POLICY } from "@/constants/business";
import { ROUTES } from "@/constants/routes";
import { formatDayInZone, formatTimeInZone } from "@/lib/utils/timezone";
import type { BookingFormProps } from "./BookingForm.types";

/**
 * Confirms who is booking and records acceptance of the cancellation policy.
 *
 * The contact fields arrive prefilled from the diagnosis (`lead.service.ts`
 * keeps them in `sessionStorage`), so for most visitors this is a glance and a
 * checkbox. Someone landing on `/agendar` cold fills them in here.
 *
 * The checkbox is NOT decoration: `context.md` §8.9 requires the acceptance to
 * be recorded with its timestamp and IP, and the server stamps both when this
 * is submitted. It cannot be pre-ticked — an acceptance nobody performed is
 * not an acceptance.
 */
export function BookingForm({
  startUtc,
  clientTimezone,
  contact,
  submitting,
  error,
  fieldErrors,
  onSubmit,
}: BookingFormProps) {
  const [fullName, setFullName] = useState(contact?.fullName ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const start = new Date(startUtc);
  const showBothZones = clientTimezone !== BUSINESS_TIMEZONE;

  return (
    <form
      className="rounded-card border border-border bg-surface p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ fullName, email, phone, policyAccepted });
      }}
    >
      <div className="flex items-start gap-3 rounded-card bg-surface-muted p-4">
        <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />

        <div>
          <p className="text-sm font-medium text-ink first-letter:uppercase">
            {formatDayInZone(start, clientTimezone)} · {formatTimeInZone(start, clientTimezone)}
          </p>

          {showBothZones ? (
            <p className="mt-0.5 text-xs text-ink-muted">
              {formatTimeInZone(start, BUSINESS_TIMEZONE)} en San Antonio
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Input
          id="booking-name"
          label="Nombre completo"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={fieldErrors?.fullName}
          autoComplete="name"
          required
        />
        <Input
          id="booking-email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors?.email}
          hint="Aquí te llega la confirmación y el enlace de la videollamada."
          autoComplete="email"
          required
        />
        <Input
          id="booking-phone"
          label="Teléfono"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={fieldErrors?.phone}
          autoComplete="tel"
          required
        />
      </div>

      <div className="mt-5 rounded-card border border-border p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={policyAccepted}
            onChange={(event) => setPolicyAccepted(event.target.checked)}
            aria-describedby="booking-policy-detail"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent"
          />

          <span className="text-xs leading-relaxed text-ink">
            Acepto la{" "}
            <a
              href={ROUTES.policies}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2"
            >
              política de cancelación
            </a>
            .
          </span>
        </label>

        <p id="booking-policy-detail" className="mt-2 pl-7 text-xs leading-relaxed text-ink-muted">
          Puedes reprogramar o cancelar sin costo con {CANCELLATION_POLICY.freeChangeWindowHours}{" "}
          horas de anticipación. Con menos, el pago no es reembolsable. Hay{" "}
          {CANCELLATION_POLICY.lateArrivalGraceMinutes} minutos de tolerancia y la sesión termina a
          la hora programada.
        </p>

        {fieldErrors?.policyAccepted ? (
          <p className="mt-2 pl-7 text-xs text-danger">{fieldErrors.policyAccepted}</p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-card border border-danger/30 bg-danger/5 p-3 text-xs leading-relaxed text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="mt-5 w-full">
        {submitting ? "Apartando tu horario…" : "Apartar este horario"}
      </Button>

      <p className="mt-2 text-center text-xs text-ink-muted">
        Apartamos el horario mientras completas el pago. La cita queda confirmada al pagar.
      </p>
    </form>
  );
}
