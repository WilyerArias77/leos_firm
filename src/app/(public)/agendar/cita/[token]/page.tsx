import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarX2, Clock, Mail, MapPin, Phone, Video } from "lucide-react";
import { AppointmentActions } from "@/components/features/appointments/AppointmentActions";
import { AppointmentTime } from "@/components/features/appointments/AppointmentTime";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { BUSINESS_TIMEZONE, COMPANY } from "@/constants/business";
import { ROUTES } from "@/constants/routes";
import { readAppointmentToken } from "@/lib/utils/appointmentToken";
import {
  formatDayInZone,
  formatTimeInZone,
  timeZoneAbbreviation,
} from "@/lib/utils/timezone";
import { fetchAppointment, toAppointmentView } from "@/services/appointment-management.service";
import type { AppointmentStatus, AppointmentView } from "@/types/appointment.types";

/**
 * `/agendar/cita/[token]` — the client's own appointment
 * (`docs/features/appointment-management.md`).
 *
 * A Server Component, and it has to be: it verifies the HMAC of the token, asks
 * n8n for the Calendar event and applies `context.md` §8 with the server's own
 * clock, in UTC. None of those three may happen in a browser.
 *
 * **An invalid signature and an appointment that no longer exists both answer
 * `notFound()`.** Distinguishing them would turn this page into an oracle for
 * which tokens are cryptographically valid. A 404 says nothing at all.
 *
 * Next 16: `params` is async — `await props.params`, never the 15-and-earlier
 * synchronous form.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu cita",
  description: "Consulta, cancela o pide otro horario para tu cita con Leos Firm.",
  // A private link must never end up in an index.
  robots: { index: false, follow: false },
};

const PHONE_HREF = `tel:+1${COMPANY.phone.replace(/\D/g, "")}`;

const STATUS_COPY: Record<AppointmentStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmada", className: "border-success/30 bg-success/5 text-success" },
  tentative: {
    label: "Pendiente de pago",
    className: "border-warning/30 bg-warning/5 text-warning",
  },
  cancelled: { label: "Cancelada", className: "border-danger/30 bg-danger/5 text-danger" },
  past: { label: "Ya realizada", className: "border-border bg-surface-muted text-ink-muted" },
};

export default async function AppointmentPage(props: PageProps<"/agendar/cita/[token]">) {
  const { token } = await props.params;

  const eventId = readAppointmentToken(token);
  if (!eventId) notFound();

  const lookup = await fetchAppointment(eventId);

  if (!lookup.ok) {
    // "Gone" and "we could not ask" are different answers and get different
    // pages. Telling someone their appointment vanished because our integration
    // is down would be the worse mistake by a wide margin.
    if (lookup.reason === "not-found") notFound();

    return <UpstreamFailure />;
  }

  const view = toAppointmentView(lookup.appointment, new Date());
  const start = new Date(view.startUtc);
  const status = STATUS_COPY[view.status];

  return (
    <Section>
      <Container size="narrow">
        <p className="text-xs font-medium tracking-widest text-accent uppercase">Tu cita</p>

        <h1 className="mt-3 font-serif text-3xl text-navy-900 sm:text-4xl">
          {view.serviceName}
        </h1>

        <p
          className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </p>

        <Card className="mt-8 p-6">
          <p className="text-xs font-medium tracking-widest text-ink-muted uppercase">
            En tu horario
          </p>

          <div className="mt-2">
            <AppointmentTime
              startUtc={view.startUtc}
              endUtc={view.endUtc}
              bookedTimezone={view.bookedTimezone}
            />
          </div>

          {/* The firm's hour is rendered on the server and is never omitted:
              showing one clock alone is how somebody joins an hour late. */}
          <div className="mt-5 border-t border-border pt-5">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-widest text-ink-muted uppercase">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              En San Antonio, Texas
            </p>

            <p className="mt-2 text-sm text-ink">
              {formatDayInZone(start, BUSINESS_TIMEZONE)} ·{" "}
              {formatTimeInZone(start, BUSINESS_TIMEZONE)}{" "}
              <span className="text-ink-muted">
                ({timeZoneAbbreviation(start, BUSINESS_TIMEZONE)})
              </span>
            </p>
          </div>

          {view.meetingUrl && view.status !== "cancelled" ? (
            <div className="mt-5 border-t border-border pt-5">
              <p className="flex items-center gap-1.5 text-xs font-medium tracking-widest text-ink-muted uppercase">
                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                Enlace de la reunión
              </p>

              <a
                href={view.meetingUrl}
                className="mt-2 inline-block text-sm break-all text-accent underline underline-offset-4 hover:no-underline"
              >
                {view.meetingUrl}
              </a>
            </div>
          ) : null}
        </Card>

        <PolicyNotice view={view} />

        {view.canBeManaged && view.refundWindow ? (
          <AppointmentActions
            token={token}
            refundWindow={view.refundWindow}
            phone={COMPANY.phone}
          />
        ) : (
          <ClosedNotice status={view.status} />
        )}

        <p className="mt-10 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <Phone aria-hidden="true" className="h-4 w-4 text-navy-500" />
          <span>¿Prefieres hablarlo con nosotros?</span>
          <a
            className="font-medium text-accent underline underline-offset-4 hover:no-underline"
            href={PHONE_HREF}
          >
            {COMPANY.phone}
          </a>
        </p>
      </Container>
    </Section>
  );
}

/**
 * What `context.md` §8 says applies right now, computed on the server.
 *
 * It informs; it does not decide. Someone can open this at 24 h and 10 minutes
 * and press cancel half an hour later — the endpoint recomputes on its own
 * clock and its verdict is the one that reaches Claudia.
 */
function PolicyNotice({ view }: { view: AppointmentView }) {
  if (!view.canBeManaged) return null;

  const hours = Math.floor(view.hoursUntilStart);

  return (
    <div className="mt-6 rounded-card border border-border bg-surface-muted p-5">
      <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
        <Clock className="h-4 w-4 text-navy-500" aria-hidden="true" />
        {hours >= 1
          ? `Faltan unas ${hours} horas para tu consulta`
          : "Tu consulta empieza en menos de una hora"}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {view.refundWindow === "mayor-24h"
          ? "Con 24 horas o más de anticipación puedes reprogramar sin costo, o cancelar y recibir un reembolso menos las comisiones bancarias o de procesamiento — o dejar el monto como crédito para una consultoría futura."
          : "Con menos de 24 horas de anticipación el pago ya no es reembolsable. Puedes cancelar igual para liberar el horario, y pedirle otro momento a Claudia."}
      </p>

      <Link
        href={ROUTES.policies}
        className="mt-3 inline-block text-xs text-accent underline underline-offset-4"
      >
        Leer la política completa
      </Link>
    </div>
  );
}

/** Cancelled, or already started: §8 stops offering anything from here. */
function ClosedNotice({ status }: { status: AppointmentStatus }) {
  return (
    <div className="mt-8 rounded-card border border-border bg-surface-muted p-5">
      <h2 className="flex items-center gap-2 font-serif text-lg text-navy-900">
        <CalendarX2 className="h-5 w-5 text-ink-muted" aria-hidden="true" />
        {status === "cancelled" ? "Esta cita está cancelada" : "Esta consulta ya pasó"}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {status === "cancelled"
          ? "Si quieres agendar otra, elige el servicio y te mostramos los horarios disponibles."
          : "Una consulta que ya empezó se considera realizada, así que no se puede cancelar ni mover desde aquí. Si quieres continuar tu caso, agenda una nueva o llámanos."}
      </p>

      <Link
        href={ROUTES.booking}
        className="mt-3 inline-block text-sm text-accent underline underline-offset-4"
      >
        Agendar una nueva consulta
      </Link>
    </div>
  );
}

/**
 * n8n did not answer. Same treatment as everywhere else in this funnel: our
 * failure never becomes the visitor's, and the way out is the firm's inbox.
 *
 * Email rather than the phone here, by the client's decision (2026-08-11): this
 * screen appears when our own integration is down, and she would rather receive
 * a written message she can act on than a call that may ring unanswered.
 */
function UpstreamFailure() {
  return (
    <Section>
      <Container size="narrow">
        <h1 className="font-serif text-3xl text-navy-900">No pudimos abrir tu cita</h1>

        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Tu cita sigue en pie: lo que falló fue nuestra conexión para mostrártela. Vuelve a
          intentarlo en un momento, o escríbenos y lo resolvemos contigo.
        </p>

        <p className="mt-6 flex flex-wrap items-center gap-2 text-base">
          <Mail aria-hidden="true" className="h-4 w-4 text-navy-500" />
          <a
            className="font-medium text-accent underline underline-offset-4 hover:no-underline"
            href={`mailto:${COMPANY.email}`}
          >
            {COMPANY.email}
          </a>
        </p>
      </Container>
    </Section>
  );
}
