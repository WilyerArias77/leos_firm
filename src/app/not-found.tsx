import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { COMPANY } from "@/constants/business";
import { ROUTES } from "@/constants/routes";

/**
 * 404 — `docs/features/public-site.md` (FASE 8).
 *
 * Lives at the root of `app/` and not inside `(public)/` on purpose: a URL that
 * matches no route never enters a route group, so only a root `not-found` can
 * catch it. That is also why the chrome is rendered here by hand — `(public)/
 * layout.tsx` is not in the tree for an unmatched path.
 *
 * It is a dead end for a visitor who was looking for something, so it offers the
 * three ways out that exist (catalog, FAQ, phone) instead of just apologising.
 */

export const metadata: Metadata = {
  title: "Página no encontrada",
  // A 404 must never be indexed: it would compete with the real pages.
  robots: { index: false, follow: true },
};

const PHONE_HREF = `tel:+1${COMPANY.phone.replace(/\D/g, "")}`;

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="bg-navy-900 py-16 text-platinum sm:py-24">
          <Container size="narrow">
            <p className="text-xs font-medium tracking-widest text-gold uppercase">
              Error 404
            </p>
            <h1 className="mt-4 text-4xl sm:text-5xl">No encontramos esta página</h1>
            <p className="mt-5 text-lg leading-relaxed text-platinum-dim">
              Puede que el enlace esté mal escrito o que la página ya no exista. Lo que
              buscas probablemente está en nuestros servicios.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={ROUTES.services} variant="primary" size="lg">
                Ver los servicios
              </ButtonLink>
              <ButtonLink href={ROUTES.home} variant="ghost" size="lg">
                Ir al inicio
              </ButtonLink>
            </div>
          </Container>
        </section>

        <section className="py-14">
          <Container size="narrow">
            <h2 className="text-2xl">¿Buscabas algo en concreto?</h2>
            <ul className="mt-5 space-y-3 text-ink-muted">
              <li>
                <a
                  className="text-accent underline underline-offset-4 hover:no-underline"
                  href={ROUTES.faq}
                >
                  Preguntas frecuentes
                </a>{" "}
                — visas, estructuras y obligaciones fiscales.
              </li>
              <li>
                <a
                  className="text-accent underline underline-offset-4 hover:no-underline"
                  href={ROUTES.about}
                >
                  Sobre Claudia Leos
                </a>{" "}
                — quién te va a atender.
              </li>
              <li>
                <a
                  className="text-accent underline underline-offset-4 hover:no-underline"
                  href={ROUTES.policies}
                >
                  Políticas
                </a>{" "}
                — cancelaciones, reprogramaciones y reembolsos.
              </li>
            </ul>

            <p className="mt-8 flex flex-wrap items-center gap-2 text-ink-muted">
              <Phone aria-hidden="true" className="size-4 text-navy-500" />
              <span>Si prefieres que te atendamos directamente:</span>
              <a
                className="font-medium text-accent underline underline-offset-4 hover:no-underline"
                href={PHONE_HREF}
              >
                {COMPANY.phone}
              </a>
            </p>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
