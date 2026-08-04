import { Check, CircleCheckBig, Info, Phone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { COMPANY } from "@/constants/business";
import { DIAGNOSTIC_COPY, DIAGNOSTIC_RESULT_COPY } from "@/constants/content/diagnostic";
import { formatPrice } from "@/lib/utils/formatCurrency";
import type { DiagnosticResultProps } from "./DiagnosticDialog.types";

const PHONE_HREF = `tel:+1${COMPANY.phone.replace(/\D/g, "")}`;

/**
 * The diagnosis, with the next step that matches the branch.
 *
 * `checkout` — the service has a fixed price and can be paid online (FASE 7).
 * `contact`  — variable price: Claudia reviews the case herself (FASE 6).
 *
 * Neither branch claims something that does not work yet: while delivery and
 * checkout are not wired, the screen says so and offers the phone number.
 */
export function DiagnosticResult({
  titleId,
  recommendation,
  onClose,
}: DiagnosticResultProps) {
  const { service, outcome } = recommendation;
  const price = formatPrice(service.priceCents);

  const checkoutHeading = service.requiresAppointment
    ? DIAGNOSTIC_RESULT_COPY.checkoutHeading
    : DIAGNOSTIC_RESULT_COPY.checkoutHeadingProcedure;

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
          {price ? (
            <Badge variant="price">{price} USD</Badge>
          ) : (
            <Badge variant="quote">Cotización</Badge>
          )}
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
      </div>

      <div className="mt-6">
        <h3 className="font-sans text-sm font-medium text-navy-900">
          {outcome === "checkout" ? checkoutHeading : DIAGNOSTIC_RESULT_COPY.contactHeading}
        </h3>

        {outcome === "checkout" ? (
          <>
            <Button type="button" disabled className="mt-3 w-full">
              {DIAGNOSTIC_RESULT_COPY.checkoutPendingLabel}
            </Button>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              {DIAGNOSTIC_RESULT_COPY.checkoutPending}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {DIAGNOSTIC_RESULT_COPY.contactBody}
          </p>
        )}
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-card border border-border bg-surface p-3 text-xs leading-relaxed text-ink-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        {DIAGNOSTIC_RESULT_COPY.pendingDelivery}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <a
          href={PHONE_HREF}
          className="inline-flex w-full items-center justify-center gap-2 rounded-card bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          {DIAGNOSTIC_RESULT_COPY.callLabel} · {COMPANY.phone}
        </a>

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
