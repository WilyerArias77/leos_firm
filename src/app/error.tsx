"use client";

import { useEffect } from "react";
import { Phone, RotateCcw } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Button, ButtonLink } from "@/components/ui/Button";
import { COMPANY } from "@/constants/business";
import { ROUTES } from "@/constants/routes";

/**
 * 500 — `docs/features/public-site.md` (FASE 8).
 *
 * A Client Component because React needs `reset` to re-render the boundary, and
 * it renders inside the root layout — the chrome is NOT drawn here, unlike
 * `not-found.tsx`: an error inside `(public)` keeps that group's Header and
 * Footer, and duplicating them would show two of each.
 *
 * The one rule that shapes the copy: **this screen may be a visitor mid-payment**
 * (`docs/features/payments.md` — our failure gets the phone number, never a bare
 * stack trace). It says the slot is still held, because it is: the tentative
 * reservation survives a failed render.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // `digest` is the only handle that ties this screen to a server log line, and
    // it carries no PII — ids, not content (`docs/03-security.md`).
    console.error(`[ui] error no controlado (${error.digest ?? "sin digest"})`);
  }, [error.digest]);

  return (
    <section className="py-16 sm:py-24">
      <Container size="narrow">
        <p className="text-xs font-medium tracking-widest text-danger uppercase">
          Algo salió mal
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl">Se nos cayó esta página</h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-muted">
          El fallo es nuestro, no tuyo. Si estabas agendando una cita,{" "}
          <strong className="font-medium text-ink">tu horario sigue apartado</strong> —
          no hace falta empezar de nuevo.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset} size="lg">
            <RotateCcw aria-hidden="true" className="size-4" />
            Intentar de nuevo
          </Button>
          <ButtonLink href={ROUTES.home} variant="secondary" size="lg">
            Ir al inicio
          </ButtonLink>
        </div>

        <p className="mt-10 flex flex-wrap items-center gap-2 text-ink-muted">
          <Phone aria-hidden="true" className="size-4 text-navy-500" />
          <span>Si vuelve a pasar, llámanos y lo resolvemos contigo:</span>
          <a
            className="font-medium text-accent underline underline-offset-4 hover:no-underline"
            href={`tel:+1${COMPANY.phone.replace(/\D/g, "")}`}
          >
            {COMPANY.phone}
          </a>
        </p>

        {error.digest ? (
          <p className="mt-6 text-sm text-ink-muted">
            Código de referencia:{" "}
            <code className="rounded bg-surface-muted px-1.5 py-0.5">{error.digest}</code>
          </p>
        ) : null}
      </Container>
    </section>
  );
}
