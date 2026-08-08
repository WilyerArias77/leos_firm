import { ArrowRight, Check, CircleCheckBig, Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DIAGNOSTIC_COPY, DIAGNOSTIC_RESULT_COPY } from "@/constants/content/diagnostic";
import { PRICING_COPY } from "@/constants/content/services";
import { ROUTES } from "@/constants/routes";
import { formatPrice } from "@/lib/utils/formatCurrency";
import type { DiagnosticResultProps } from "./DiagnosticDialog.types";

/**
 * The diagnosis and the single next step: agendar y pagar.
 *
 * The two-branch version (checkout vs. email to Claudia) died with ADR-009 —
 * every service is priced, so every visitor gets the same path.
 *
 * The scheduling button is live since FASE 5 and carries the deduced service
 * to `/agendar`. It is now the ONLY button on the screen: the call button was
 * removed on 2026-08-07 (client request). If the CRM did not take the lead the
 * visitor still gets the phone number, but as part of that message and not as a
 * standing second call to action — that fallback is permanent.
 */
export function DiagnosticResult({ titleId, service, delivery, onClose }: DiagnosticResultProps) {
  const pricing = PRICING_COPY[service.pricingModel];

  return (
    <div className="p-6 pt-16 sm:p-8 sm:pt-16">
      <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-accent uppercase">
        <CircleCheckBig className="h-4 w-4" aria-hidden="true" />
        {DIAGNOSTIC_COPY.resultTitle}
      </p>

      <h2 id={titleId} className="mt-3 font-serif text-xl text-navy-900">
        {DIAGNOSTIC_RESULT_COPY.leadIn}
      </h2>

      <div className="mt-5 rounded-card border border-border bg-surface-muted p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg text-navy-900">{service.name}</h3>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant="price">{formatPrice(service.priceCents)} USD</Badge>
            {pricing.label ? <Badge variant="quote">{pricing.label}</Badge> : null}
          </div>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {service.shortDescription}
        </p>

        <ul className="mt-4 space-y-2">
          {service.includes.map((item) => (
            <li key={item} className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span className="text-xs leading-relaxed text-ink">{item}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-ink-muted">
          {pricing.note}
        </p>
      </div>

      <div className="mt-6">
        <h3 className="font-sans text-sm font-medium text-navy-900">
          {DIAGNOSTIC_RESULT_COPY.nextStepHeading}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {DIAGNOSTIC_RESULT_COPY.nextStepBody}
        </p>

        {/* The single next step since ADR-009. It carries the deduced service
            so `/agendar` reads its price and duration from the catalog — the
            slug travels, never the amount (ADR-006). */}
        <ButtonLink
          href={`${ROUTES.booking}?servicio=${service.slug}`}
          className="mt-3 w-full"
        >
          {DIAGNOSTIC_RESULT_COPY.scheduleLabel}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </ButtonLink>

        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          {DIAGNOSTIC_RESULT_COPY.scheduleNote}
        </p>
      </div>

      {delivery === "failed" ? (
        <p className="mt-5 flex items-start gap-2 rounded-card border border-border bg-surface p-3 text-xs leading-relaxed text-ink-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
          {DIAGNOSTIC_RESULT_COPY.deliveryFailed}
        </p>
      ) : null}

      <div className="mt-6">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-card px-4 py-2.5 text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          {DIAGNOSTIC_RESULT_COPY.closeLabel}
        </button>
      </div>
    </div>
  );
}
