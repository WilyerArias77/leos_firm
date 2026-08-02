import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import {
  CANCELLATION_POLICY_ITEMS,
  POLICY_INTRO,
} from "@/constants/content/policies";

export const metadata: Metadata = {
  title: "Política de cancelación y reprogramación",
  description:
    "Condiciones de confirmación, reprogramación, cancelación y reembolso de las consultorías de Leos Firm LLC.",
};

export default function PoliciesPage() {
  return (
    <>
      <section className="bg-navy-900 py-16 text-platinum sm:py-20">
        <Container size="narrow">
          <p className="text-xs font-medium tracking-widest text-gold uppercase">
            Términos
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl">
            Política de cancelación y reprogramación
          </h1>
          <p className="mt-5 leading-relaxed text-platinum-dim">{POLICY_INTRO}</p>
        </Container>
      </section>

      <Section>
        <Container size="narrow">
          <ol className="space-y-4">
            {CANCELLATION_POLICY_ITEMS.map((item, index) => (
              <li key={item.title}>
                <Card className="flex gap-5 p-6">
                  <span
                    className="font-serif text-2xl text-gold tabular-nums"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="font-serif text-lg text-navy-900">{item.title}</h2>
                    <p className="mt-2 leading-relaxed text-ink-muted">
                      {item.description}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>

          <p className="mt-10 text-sm leading-relaxed text-ink-muted">
            Al reservar y realizar el pago de una consultoría, confirmas que has leído,
            comprendido y aceptas estas políticas.
          </p>
        </Container>
      </Section>
    </>
  );
}
