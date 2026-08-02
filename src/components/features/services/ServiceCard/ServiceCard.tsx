import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/services/service.service";
import { ROUTES } from "@/constants/routes";
import type { ServiceCardProps } from "./ServiceCard.types";

export function ServiceCard({ service }: ServiceCardProps) {
  const price = formatPrice(service.priceCents);

  return (
    <Card interactive className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl text-navy-900">{service.name}</h3>
        {price ? (
          <Badge variant="price">{price} USD</Badge>
        ) : (
          <Badge variant="quote">Cotización</Badge>
        )}
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
        {service.shortDescription}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        {service.isSubscription ? (
          <span className="text-xs text-ink-muted">Servicio recurrente</span>
        ) : service.durationMinutes ? (
          <span className="text-xs text-ink-muted">
            Sesión de {service.durationMinutes} minutos
          </span>
        ) : (
          <span className="text-xs text-ink-muted">Trámite puntual</span>
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
