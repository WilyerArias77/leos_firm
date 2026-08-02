import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock, Phone } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  formatPrice,
  getServiceBySlug,
  getServiceSlugs,
} from "@/services/service.service";
import { COMPANY } from "@/constants/business";
import { INTAKE_REQUIREMENTS } from "@/constants/content/policies";
import { ROUTES } from "@/constants/routes";

const PHONE_HREF = `tel:+1${COMPANY.phone.replace(/\D/g, "")}`;

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

  const price = formatPrice(service.priceCents);

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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {price ? (
              <span className="font-serif text-3xl text-gold">{price} USD</span>
            ) : (
              <Badge variant="quote">Requiere cotización</Badge>
            )}

            {service.durationMinutes ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-platinum-dim">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {service.durationMinutes} minutos
              </span>
            ) : null}

            {service.isSubscription ? (
              <span className="text-sm text-platinum-dim">
                Suscripción mensual con cobro automático
              </span>
            ) : null}
          </div>
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

              {service.requiresAppointment ? (
                <>
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
                </>
              ) : null}
            </div>

            <aside className="lg:col-span-1">
              <Card className="sticky top-28 p-6">
                <h2 className="font-serif text-xl text-navy-900">Agendar</h2>

                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  El agendamiento y pago en línea estarán disponibles próximamente.
                  Mientras tanto, comunícate directamente con la firma.
                </p>

                <a
                  href={PHONE_HREF}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-card bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {COMPANY.phone}
                </a>

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
