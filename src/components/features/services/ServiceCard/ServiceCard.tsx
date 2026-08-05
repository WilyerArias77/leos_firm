import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/services/service.service";
import { PRICING_COPY } from "@/constants/content/services";
import { ROUTES } from "@/constants/routes";
import type { ServiceCardProps } from "./ServiceCard.types";

export function ServiceCard({ service }: ServiceCardProps) {
  const price = formatPrice(service.priceCents);
  const pricing = PRICING_COPY[service.pricingModel];

  return (
    <Card interactive className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl text-navy-900">{service.name}</h3>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant="price">{price} USD</Badge>
          {pricing.label ? <Badge variant="quote">{pricing.label}</Badge> : null}
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
        {service.shortDescription}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        {service.isSubscription ? (
          <span className="text-xs text-ink-muted">Servicio recurrente</span>
        ) : (
          <span className="text-xs text-ink-muted">
            Sesión de {service.durationMinutes} minutos
          </span>
        )}

        <Link
          href={ROUTES.service(service.slug)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
        >
          Ver detalle
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">de {service.name}</span>
        </Link>
      </div>
    </Card>
  );
}
