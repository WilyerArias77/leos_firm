import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { DiagnosticTrigger } from "@/components/features/diagnostic/DiagnosticTrigger";
import {
  formatPrice,
  getServiceBySlug,
  getServiceSlugs,
  getServices,
} from "@/services/service.service";
import { DIAGNOSTIC_COPY } from "@/constants/content/diagnostic";
import { INTAKE_REQUIREMENTS } from "@/constants/content/policies";
import { DEPOSIT_NOTICE, PRICING_COPY } from "@/constants/content/services";
import { ROUTES } from "@/constants/routes";

export async function generateStaticParams() {
  const slugs = await getServiceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/servicios/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const service = await getServiceBySlug(slug);

  if (!service) return { title: "Servicio no encontrado" };

  return {
    title: service.name,
    description: service.shortDescription,
  };
}

export default async function ServiceDetailPage(props: PageProps<"/servicios/[slug]">) {
  const { slug } = await props.params;
  const service = await getServiceBySlug(slug);

  if (!service) notFound();

  // The catalog travels to the popup so the diagnosis resolves in the browser
  // without a round trip (`docs/features/lead-diagnostic.md`).
  const services = await getServices();
  const price = formatPrice(service.priceCents);
  const pricing = PRICING_COPY[service.pricingModel];

  return (
    <>
      <section className="bg-navy-900 py-16 text-platinum sm:py-20">
        <Container>
          <Link
            href={ROUTES.services}
            className="inline-flex items-center gap-1.5 text-sm text-platinum-dim hover:text-platinum"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a servicios
          </Link>

          <h1 className="mt-6 max-w-3xl text-4xl sm:text-5xl">{service.name}</h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="font-serif text-3xl text-gold">{price} USD</span>

            {pricing.label ? (
              <span className="text-sm text-platinum-dim">{pricing.label}</span>
            ) : null}

            <span className="inline-flex items-center gap-1.5 text-sm text-platinum-dim">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {service.durationMinutes} minutos
            </span>

            {service.isSubscription ? (
              <span className="text-sm text-platinum-dim">
                Suscripción mensual con cobro automático
              </span>
            ) : null}
          </div>

          <p className="mt-3 max-w-2xl text-sm text-platinum-dim">{pricing.note}</p>
        </Container>
      </section>

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="text-2xl text-navy-900">En qué consiste</h2>
              <p className="mt-4 leading-relaxed text-ink-muted">
                {service.longDescription}
              </p>

              <h2 className="mt-12 text-2xl text-navy-900">Qué incluye</h2>
              <ul className="mt-4 space-y-3">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check
                      className="mt-0.5 h-5 w-5 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span className="text-ink">{item}</span>
                  </li>
                ))}
              </ul>

              <h2 className="mt-12 text-2xl text-navy-900">
                Qué necesitarás tener a la mano
              </h2>
              <ul className="mt-4 space-y-3">
                {INTAKE_REQUIREMENTS.map((requirement) => (
                  <li key={requirement} className="flex gap-3">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                      aria-hidden="true"
                    />
                    <span className="text-sm leading-relaxed text-ink-muted">
                      {requirement}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="lg:col-span-1">
              <Card className="sticky top-40 p-6">
                <p className="text-xs font-medium tracking-widest text-accent uppercase">
                  {DIAGNOSTIC_COPY.eyebrow}
                </p>

                <h2 className="mt-2 font-serif text-xl text-navy-900">
                  ¿Es este el servicio que necesitas?
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {DIAGNOSTIC_COPY.teaser}
                </p>

                <DiagnosticTrigger
                  services={services}
                  contextService={service}
                  autoOpen
                  label="Quiero acceder al servicio"
                  className="mt-5 w-full"
                />

                {/* Reemplaza al botón del teléfono, retirado por pedido de la
                    clienta el 2026-08-06: la tarjeta empuja al diagnóstico, no
                    a la llamada. */}
                <p className="mt-3 rounded-card border border-border bg-surface-muted p-3 text-sm leading-relaxed text-ink-muted">
                  {DEPOSIT_NOTICE}
                </p>

                <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-ink-muted">
                  Las citas se confirman únicamente después del pago. Consulta la{" "}
                  <Link href={ROUTES.policies} className="text-accent hover:underline">
                    política de cancelación
                  </Link>
                  .
                </p>
              </Card>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
