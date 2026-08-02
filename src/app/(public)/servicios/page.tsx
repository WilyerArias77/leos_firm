import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ServiceCard } from "@/components/features/services/ServiceCard";
import { getServices } from "@/services/service.service";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Consultoría fiscal, apertura y estructuración de LLC, bookkeeping, payroll y cumplimiento estatal para empresarios internacionales en Estados Unidos.",
};

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <section className="bg-navy-900 py-16 text-platinum sm:py-20">
        <Container>
          <p className="text-xs font-medium tracking-widest text-gold uppercase">
            Catálogo
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl">Servicios</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-platinum-dim">
            Los precios de varios servicios dependen de tu caso concreto, por lo que
            requieren una consultoría de evaluación previa.
          </p>
        </Container>
      </section>

      <Section>
        <Container>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.slug}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
