import { Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DIAGNOSTIC_COPY } from "@/constants/content/diagnostic";
import { PRICING_COPY } from "@/constants/content/services";
import { formatPrice } from "@/lib/utils/formatCurrency";
import type { DiagnosticIntroProps } from "./DiagnosticDialog.types";

/**
 * First screen of the popup.
 *
 * The decline button keeps the wording the client asked for, word for word.
 * Since 2026-08-03 the popup also has a close button on every step (client
 * request) — see the accessibility note in `docs/features/lead-diagnostic.md`.
 */
export function DiagnosticIntro({
  titleId,
  service,
  onAccept,
  onDecline,
}: DiagnosticIntroProps) {
  const pricing = service ? PRICING_COPY[service.pricingModel] : null;

  return (
    <div className="p-6 pt-16 sm:p-8 sm:pt-16">
      <p className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-accent uppercase">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {DIAGNOSTIC_COPY.eyebrow}
      </p>

      <h2 id={titleId} className="mt-3 font-serif text-2xl text-navy-900">
        {DIAGNOSTIC_COPY.introTitle}
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        {service ? DIAGNOSTIC_COPY.introBodyWithService : DIAGNOSTIC_COPY.introBody}
      </p>

      {service && pricing ? (
        <div className="mt-6 rounded-card border border-border bg-surface-muted p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-base text-navy-900">{service.name}</h3>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Badge variant="price">{formatPrice(service.priceCents)} USD</Badge>
              {pricing.label ? <Badge variant="quote">{pricing.label}</Badge> : null}
            </div>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {service.shortDescription}
          </p>

          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Sesión de {service.durationMinutes} minutos
          </p>
        </div>
      ) : null}

      <div className="mt-7 flex flex-col gap-3">
        <Button type="button" size="lg" onClick={onAccept} className="w-full">
          {DIAGNOSTIC_COPY.acceptLabel}
        </Button>

        <button
          type="button"
          onClick={onDecline}
          className="w-full rounded-card px-4 py-2.5 text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          {DIAGNOSTIC_COPY.declineLabel}
        </button>
      </div>
    </div>
  );
}
