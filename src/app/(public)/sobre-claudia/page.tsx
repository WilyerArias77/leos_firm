import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section, SectionHeading } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CLIENT_LOCATIONS,
  FOUNDER,
  FOUNDER_MEDIA,
  MISSION,
  VALUES,
  VISION,
} from "@/constants/content/company";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Sobre Claudia Leos",
  description: FOUNDER.bio,
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-navy-900 py-16 text-platinum sm:py-20">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <p className="text-xs font-medium tracking-widest text-gold uppercase">
                {FOUNDER.role}
              </p>
              <h1 className="mt-4 text-4xl sm:text-5xl">{FOUNDER.name}</h1>
              <p className="mt-2 text-sm tracking-widest text-platinum-dim uppercase">
                {FOUNDER.title}
              </p>
              <p className="mt-8 text-lg leading-relaxed text-platinum-dim">
                {FOUNDER.bio}
              </p>
            </div>

            {/* Fotografía profesional entregada por la firma (context.md §2) */}
            <div className="lg:col-span-2">
              <Image
                src={FOUNDER_MEDIA.photo}
                alt={FOUNDER_MEDIA.photoAlt}
                width={FOUNDER_MEDIA.photoWidth}
                height={FOUNDER_MEDIA.photoHeight}
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="aspect-4/5 w-full rounded-card border border-navy-700 object-cover shadow-elevated"
              />
            </div>
          </div>

          {/* Video de presentación, debajo del texto (context.md §2) */}
          <div className="mt-16 border-t border-navy-700 pt-12">
            <p className="text-xs font-medium tracking-widest text-gold uppercase">
              Video de presentación
            </p>
            <h2 className="mt-3 text-3xl text-platinum sm:text-4xl">
              Conoce a {FOUNDER.name}
            </h2>

            <video
              controls
              preload="metadata"
              playsInline
              className="mt-8 aspect-video w-full max-w-3xl rounded-card border border-navy-700 bg-navy-950 shadow-elevated"
            >
              <source src={FOUNDER_MEDIA.video} type={FOUNDER_MEDIA.videoType} />
              Tu navegador no puede reproducir este video.{" "}
              <a href={FOUNDER_MEDIA.video} className="text-gold underline">
                Descárgalo aquí
              </a>
              .
            </video>
          </div>
        </Container>
      </section>

      {/* Diferenciador */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Su diferenciador"
            title="Una contadora en San Antonio que también es contadora en México"
            description={FOUNDER.differentiator}
          />
          <p className="mt-8 max-w-2xl text-sm text-ink-muted">
            Sus clientes están en {CLIENT_LOCATIONS.join(", ")}.
          </p>
        </Container>
      </Section>

      {/* Misión y visión */}
      <Section tone="muted">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-8">
              <h2 className="font-serif text-2xl text-navy-900">Misión</h2>
              <p className="mt-4 leading-relaxed text-ink-muted">{MISSION}</p>
            </Card>
            <Card className="p-8">
              <h2 className="font-serif text-2xl text-navy-900">Visión</h2>
              <p className="mt-4 leading-relaxed text-ink-muted">{VISION}</p>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Valores */}
      <Section tone="navy">
        <Container>
          <SectionHeading
            tone="navy"
            eyebrow="Valores"
            title="Cómo trabajamos"
          />

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((value) => (
              <li
                key={value.name}
                className="rounded-card border border-navy-700 bg-navy-800 p-6"
              >
                <h3 className="font-serif text-lg text-gold">{value.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-platinum-dim">
                  {value.description}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="muted">
        <Container>
          <Card className="p-10 text-center sm:p-14">
            <h2 className="text-3xl text-navy-900">Hablemos de tu caso</h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-muted">
              Cada estructura empresarial es distinta. Revisa los servicios y elige el
              que corresponde a tu situación.
            </p>
            <div className="mt-8">
              <ButtonLink href={ROUTES.services} size="lg">
                Ver servicios
              </ButtonLink>
            </div>
          </Card>
        </Container>
      </Section>
    </>
  );
}
