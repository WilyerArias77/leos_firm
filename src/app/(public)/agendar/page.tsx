import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { BookingFlow } from "@/components/features/scheduling/BookingFlow";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { PRICING_COPY } from "@/constants/content/services";
import { ROUTES } from "@/constants/routes";
import { formatPrice, getServiceBySlug, getServices } from "@/services/service.service";

/**
 * `/agendar` — the booking screen (`docs/features/scheduling.md`).
 *
 * A Server Component: it reads the service from the catalog so the price, the
 * name and the session length come from the server and never from the URL
 * (ADR-006). The interactive calendar below is the only client part.
 *
 * Without `?servicio=`, it shows the catalog instead of failing — someone can
 * reach this page from a bookmark or a shared link.
 */

export const metadata: Metadata = {
  title: "Agendar tu consulta",
  description:
    "Elige el día y la hora de tu consulta con Leos Firm. Apartamos tu horario y lo confirmas con el pago.",
};

export default async function BookingPage(props: PageProps<"/agendar">) {
  const { servicio } = await props.searchParams;
  const slug = typeof servicio === "string" ? servicio : undefined;
  const service = slug ? await getServiceBySlug(slug) : null;

  if (!service) {
    return <ServicePicker />;
  }

  const pricing = PRICING_COPY[service.pricingModel];

  return (
    <Section>
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="order-2 lg:order-1">
            <h1 className="font-serif text-2xl text-navy-900 sm:text-3xl">
              Elige el día y la hora
            </h1>

            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
              Apartamos tu horario mientras completas el pago. La cita queda confirmada cuando el
              pago se acredita.
            </p>

            <div className="mt-8">
              <BookingFlow service={service} />
            </div>
          </div>

          {/* The summary sits first on mobile: what you are paying for has to be
              visible before the calendar, not after scrolling past it. */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-40">
            <Card className="p-5">
              <h2 className="font-serif text-lg text-navy-900">{service.name}</h2>

              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {service.shortDescription}
              </p>

              <p className="mt-4 flex items-baseline gap-2">
                <span className="font-serif text-2xl text-navy-900">
                  {formatPrice(service.priceCents)}
                </span>
                <span className="text-xs text-ink-muted">USD</span>
              </p>

              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Sesión de {service.durationMinutes} minutos
              </p>

              <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-ink-muted">
                {pricing.note}
              </p>

              <ul className="mt-4 space-y-2">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                    <span className="text-xs leading-relaxed text-ink">{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={ROUTES.service(service.slug)}
                className="mt-4 inline-block text-xs text-accent underline underline-offset-4"
              >
                Ver el detalle del servicio
              </Link>
            </Card>
          </aside>
        </div>
      </Container>
    </Section>
  );
}

/** Shown when the link carries no service — a bookmark, or a shared URL. */
async function ServicePicker() {
  const services = await getServices();

  return (
    <Section>
      <Container>
        <h1 className="font-serif text-2xl text-navy-900 sm:text-3xl">
          ¿Qué servicio quieres agendar?
        </h1>

        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
          Elige uno para ver los horarios disponibles. Si no sabes cuál necesitas, el diagnóstico
          gratuito te lo dice en tres preguntas.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <li key={service.slug}>
              <Link
                href={`${ROUTES.booking}?servicio=${service.slug}`}
                className="flex h-full items-start justify-between gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-muted"
              >
                <span>
                  <span className="block font-medium text-ink">{service.name}</span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    {formatPrice(service.priceCents)} USD · {service.durationMinutes} min
                  </span>
                </span>

                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
