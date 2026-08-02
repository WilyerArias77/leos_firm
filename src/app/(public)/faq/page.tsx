import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { FAQ } from "@/constants/content/faq";
import { COMPANY } from "@/constants/business";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Dudas comunes sobre abrir una empresa en Estados Unidos siendo extranjero, visas, estructuras empresariales y obligaciones fiscales.",
};

const PHONE_HREF = `tel:+1${COMPANY.phone.replace(/\D/g, "")}`;

export default function FaqPage() {
  return (
    <>
      <section className="bg-navy-900 py-16 text-platinum sm:py-20">
        <Container size="narrow">
          <p className="text-xs font-medium tracking-widest text-gold uppercase">
            Preguntas frecuentes
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl">Dudas comunes</h1>
          <p className="mt-5 text-lg leading-relaxed text-platinum-dim">
            Las respuestas a estas preguntas dependen de cada caso concreto. Por eso las
            resolvemos en la consultoría, con tu situación específica sobre la mesa.
          </p>
        </Container>
      </section>

      <Section>
        <Container size="narrow">
          <ul className="space-y-4">
            {FAQ.map((item) => (
              <li key={item.question}>
                <Card className="p-6">
                  <h2 className="font-serif text-lg text-navy-900">{item.question}</h2>

                  {item.answer ? (
                    <p className="mt-3 leading-relaxed text-ink-muted">{item.answer}</p>
                  ) : (
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      Esta respuesta depende de tu situación particular. Agenda una
                      consultoría y la resolvemos con los datos de tu caso.
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>

          <Card className="mt-10 p-8">
            <h2 className="font-serif text-xl text-navy-900">
              ¿Tu pregunta no está aquí?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Comunícate directamente con la firma o revisa la{" "}
              <Link href={ROUTES.policies} className="text-accent hover:underline">
                política de cancelación
              </Link>{" "}
              si tu duda es sobre pagos y reembolsos.
            </p>
            <a
              href={PHONE_HREF}
              className="mt-6 inline-flex items-center gap-2 rounded-card bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {COMPANY.phone}
            </a>
          </Card>
        </Container>
      </Section>
    </>
  );
}
