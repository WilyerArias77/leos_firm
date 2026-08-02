import Link from "next/link";
import { ArrowRight, Building2, FileCheck2, Landmark } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section, SectionHeading } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ServiceCard } from "@/components/features/services/ServiceCard";
import { getServices } from "@/services/service.service";
import { COMPANY } from "@/constants/business";
import { CLIENT_LOCATIONS, FOUNDER, TARGET_AUDIENCE } from "@/constants/content/company";
import { ROUTES } from "@/constants/routes";

const AUDIENCE_ICONS = [Building2, Landmark, FileCheck2] as const;

export default async function HomePage() {
  const services = await getServices();
  const featuredServices = services.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="bg-navy-900 py-20 text-platinum sm:py-28">
        <Container>
          <div className="max-w-3xl">
            <p className="text-xs font-medium tracking-widest text-gold uppercase">
              México <span className="px-1">|</span> Estados Unidos
            </p>

            <h1 className="mt-6 text-4xl leading-tight sm:text-5xl">
              {COMPANY.tagline}
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-platinum-dim">
              Consultoría fiscal, apertura de empresas y cumplimiento en Estados Unidos
              para empresarios e inversionistas internacionales.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={ROUTES.services} size="lg">
                Ver servicios
              </ButtonLink>
              <ButtonLink href={ROUTES.about} variant="ghost" size="lg">
                Conocer a Claudia
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Público objetivo */}
      <Section tone="muted">
        <Container>
          <SectionHeading
            eyebrow="Para quién trabajamos"
            title="Si tu negocio cruza fronteras, tu estructura tiene que estar bien hecha"
            description="Acompañamos a quienes necesitan operar formalmente en Estados Unidos sin dejar cabos sueltos."
          />

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TARGET_AUDIENCE.map((audience, index) => {
              const Icon = AUDIENCE_ICONS[index % AUDIENCE_ICONS.length];
              return (
                <li key={audience}>
                  <Card className="flex h-full gap-4 p-6">
                    <Icon
                      className="h-6 w-6 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    <p className="text-sm leading-relaxed text-ink">{audience}</p>
                  </Card>
                </li>
              );
            })}
          </ul>

          <p className="mt-8 text-sm text-ink-muted">
            Nuestros clientes están en {CLIENT_LOCATIONS.join(", ")}.
          </p>
        </Container>
      </Section>

      {/* Servicios destacados */}
      <Section>
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Servicios"
              title="Cómo podemos ayudarte"
              description="Desde una consultoría puntual hasta la administración contable mes a mes."
            />
            <Link
              href={ROUTES.services}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Ver los {services.length} servicios
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredServices.map((service) => (
              <li key={service.slug}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Claudia */}
      <Section tone="navy">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                tone="navy"
                eyebrow="Quién te acompaña"
                title={FOUNDER.name}
                description={FOUNDER.bio}
              />

              <blockquote className="mt-8 border-l-2 border-gold pl-5">
                <p className="font-serif text-xl leading-relaxed text-platinum">
                  “{FOUNDER.quote}”
                </p>
              </blockquote>

              <div className="mt-10">
                <ButtonLink href={ROUTES.about} variant="ghost">
                  Conocer su historia
                </ButtonLink>
              </div>
            </div>

            <div className="rounded-card border border-navy-700 bg-navy-800 p-8">
              <p className="text-xs font-medium tracking-widest text-gold uppercase">
                Su diferenciador
              </p>
              <p className="mt-4 leading-relaxed text-platinum-dim">
                {FOUNDER.differentiator}
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* CTA final */}
      <Section tone="muted">
        <Container>
          <Card className="p-10 text-center sm:p-14">
            <h2 className="text-3xl text-navy-900">¿Empezamos?</h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-muted">
              Agenda una consultoría y sal de ella con un plan claro sobre cómo
              estructurar tu negocio en Estados Unidos.
            </p>
            <div className="mt-8">
              <ButtonLink href={ROUTES.services} size="lg">
                Ver servicios y agendar
              </ButtonLink>
            </div>
          </Card>
        </Container>
      </Section>
    </>
  );
}
