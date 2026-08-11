"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { CalendarClock, CheckCircle2, Loader2, Mail, X } from "lucide-react";
import { RescheduleCalendar } from "@/components/features/appointments/RescheduleCalendar";
import { Button } from "@/components/ui/Button";
import { COMPANY } from "@/constants/business";
import { RESCHEDULE_PREFERENCE_MAX } from "@/lib/validation/appointment-management.schema";
import {
  cancelAppointmentByToken,
  requestRescheduleByToken,
} from "@/services/appointment.service";
import { formatDayInZone, formatTimeInZone } from "@/lib/utils/timezone";
import { cn } from "@/lib/utils/cn";
import type { AppointmentActionsProps } from "./AppointmentActions.types";

/**
 * The two buttons of the client's appointment link
 * (`docs/features/appointment-management.md`).
 *
 * It holds screen state and nothing else: every rule — whether a refund applies,
 * whether the appointment can still be touched, what Claudia is told — is
 * decided by the server, and this component could not overrule it if it tried
 * (Mandamiento II). It talks to our own API through `appointment.service.ts`,
 * never to n8n.
 *
 * Two wordings are load-bearing and neither is decoration:
 *
 * - **Cancelling asks for confirmation first.** It frees the slot and there is
 *   no undo button anywhere in this system.
 * - **"Pedir otro horario" never says the appointment was moved**, because it
 *   was not. It says Claudia will write, which is what actually happens.
 */

type Mode =
  | "idle"
  | "confirming"
  | "cancelled"
  /** The ≥24 h path: pick a real hour and move the appointment (ADR-019). */
  | "moving"
  | "moved"
  /** The fallback: free text to Claudia. Under 24 h, or past the move limit. */
  | "rescheduling"
  | "requested";

const REFUND_COPY = {
  "mayor-24h":
    "Faltan más de 24 horas, así que puedes pedir un reembolso menos las comisiones " +
    "bancarias o de procesamiento, o dejar el monto como crédito para una consultoría futura.",
  "menor-24h":
    "Faltan menos de 24 horas, así que el pago ya no es reembolsable (política §8). " +
    "Aun así puedes cancelar para liberar el horario.",
} as const;

export function AppointmentActions({
  token,
  refundWindow,
  startUtc,
  clientTimezone,
  serviceSlug,
}: AppointmentActionsProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preference, setPreference] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [movedTo, setMovedTo] = useState<string | null>(null);

  const preferenceId = useId();

  // Above 24 h the client moves the appointment themselves; below it, §8 says
  // the change is no longer free and a person has to decide, so the only door
  // left is the email. The server re-checks this either way.
  const canMoveAlone = refundWindow === "mayor-24h";

  async function handleCancel() {
    setBusy(true);
    setError(null);

    const result = await cancelAppointmentByToken(token);

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMode("cancelled");
  }

  async function handleReschedule(event: FormEvent) {
    event.preventDefault();

    setBusy(true);
    setError(null);
    setFieldError(null);

    const result = await requestRescheduleByToken(token, preference);

    setBusy(false);

    if (!result.ok) {
      setError(result.fieldErrors?.preference ? null : result.message);
      setFieldError(result.fieldErrors?.preference ?? null);
      return;
    }

    setMode("requested");
  }

  if (mode === "cancelled") {
    return (
      <Outcome title="Tu cita quedó cancelada">
        Liberamos el horario y le avisamos a Claudia. Te llega también un correo con la
        confirmación. Si corresponde un reembolso, ella lo gestiona desde su sistema de cobros y
        se comunica contigo.
      </Outcome>
    );
  }

  if (mode === "requested") {
    return (
      <Outcome title="Recibimos tu solicitud">
        <strong className="font-medium text-ink">Tu cita sigue en pie por ahora.</strong> Claudia
        te va a escribir para acordar el nuevo horario. Si necesitas algo antes, escríbele a{" "}
        {COMPANY.email}.
      </Outcome>
    );
  }

  if (mode === "moved" && movedTo) {
    return (
      <Outcome title="Tu cita quedó movida">
        Ahora es el{" "}
        <strong className="font-medium text-ink">
          {formatDayInZone(new Date(movedTo), clientTimezone)} a las{" "}
          {formatTimeInZone(new Date(movedTo), clientTimezone)}
        </strong>
        {" "}Te llega un correo con la hora nueva, y el enlace de la reunión sigue siendo el mismo de
        antes. Claudia ya está avisada.
      </Outcome>
    );
  }

  if (mode === "moving") {
    return (
      <RescheduleCalendar
        token={token}
        currentStartUtc={startUtc}
        clientTimezone={clientTimezone}
        serviceSlug={serviceSlug}
        onMoved={(next) => {
          setMovedTo(next);
          setMode("moved");
        }}
        onCancel={() => setMode("idle")}
      />
    );
  }

  return (
    <div className="mt-8">
      {mode === "idle" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="secondary" onClick={() => setMode("confirming")}>
            <X className="h-4 w-4" aria-hidden="true" />
            Cancelar la cita
          </Button>

          {/* Above 24 h this is the main action and it does the whole job, so it
              takes the primary slot and the plainest wording. Below it, the only
              thing on offer is the email, which then becomes primary itself. */}
          {canMoveAlone ? (
            <Button variant="primary" onClick={() => setMode("moving")}>
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Cambiar mi horario
            </Button>
          ) : null}

          <Button
            variant={canMoveAlone ? "secondary" : "primary"}
            onClick={() => setMode("rescheduling")}
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {canMoveAlone ? "Prefiero escribirle a Claudia" : "Pedir otro horario"}
          </Button>
        </div>
      ) : null}

      {mode === "confirming" ? (
        <div className="rounded-card border border-border bg-surface-muted p-5">
          <h2 className="font-serif text-lg text-navy-900">¿Cancelamos tu cita?</h2>

          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {REFUND_COPY[refundWindow]}
          </p>

          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            El horario vuelve a quedar libre para otra persona y esto no se puede deshacer.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={handleCancel} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
              {busy ? "Cancelando…" : "Sí, cancelar la cita"}
            </Button>

            <Button variant="primary" onClick={() => setMode("idle")} disabled={busy}>
              Mejor no
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "rescheduling" ? (
        <form
          onSubmit={handleReschedule}
          className="rounded-card border border-border bg-surface-muted p-5"
        >
          <h2 className="font-serif text-lg text-navy-900">¿Qué horario te vendría mejor?</h2>

          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Escríbelo con tus palabras. <strong className="font-medium text-ink">Esto no
            reprograma la cita todavía:</strong> Claudia lee tu mensaje y te escribe para
            acordarlo contigo.
          </p>

          <label htmlFor={preferenceId} className="mt-4 block text-sm font-medium text-ink">
            Tu horario preferido
          </label>

          <textarea
            id={preferenceId}
            value={preference}
            onChange={(event) => setPreference(event.target.value)}
            maxLength={RESCHEDULE_PREFERENCE_MAX}
            rows={4}
            required
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `${preferenceId}-error` : undefined}
            placeholder="Por ejemplo: cualquier día de la próxima semana por la tarde, después de las 3."
            className={cn(
              "mt-2 block w-full rounded-card border bg-surface px-3.5 py-2.5 text-sm text-ink",
              "placeholder:text-ink-muted focus:border-accent focus:outline-none",
              fieldError ? "border-danger" : "border-border",
            )}
          />

          <p className="mt-1.5 text-xs text-ink-muted">
            {preference.length} / {RESCHEDULE_PREFERENCE_MAX} caracteres
          </p>

          {fieldError ? (
            <p id={`${preferenceId}-error`} className="mt-1.5 text-xs text-danger">
              {fieldError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
              )}
              {busy ? "Enviando…" : "Enviar la solicitud"}
            </Button>

            <Button type="button" variant="secondary" onClick={() => setMode("idle")} disabled={busy}>
              Volver
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink"
        >
          <Mail className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The screen after a successful action. Same shape for both outcomes. */
function Outcome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-8 rounded-card border border-success/30 bg-success/5 p-5">
      <h2 className="flex items-center gap-2 font-serif text-lg text-navy-900">
        <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
        {title}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}
