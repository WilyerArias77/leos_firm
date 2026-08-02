import { SERVICES } from "@/constants/content/services";
import type { Service } from "@/types/content.types";

/**
 * Catalog data access.
 *
 * This is the ONLY module that knows where services come from. Today it reads
 * typed constants; in FASE 3 it reads the `services` table from Supabase.
 * Components import the `Service` type and never the constants directly, so
 * that swap touches this file alone (`docs/features/public-site.md`).
 *
 * Async on purpose: the signature must not change when it starts hitting the
 * database.
 */

export async function getServices(): Promise<Service[]> {
  return SERVICES.filter((service) => service.isActive).toSorted(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const service = SERVICES.find((item) => item.slug === slug && item.isActive);
  return service ?? null;
}

/** Slugs for `generateStaticParams` — prerenders every service detail page. */
export async function getServiceSlugs(): Promise<string[]> {
  return SERVICES.filter((service) => service.isActive).map((service) => service.slug);
}

/**
 * Formats a cents amount as USD — e.g. `15000` → `"$150"`.
 *
 * Uses `en-US` deliberately: the `es-MX` locale renders USD as `"USD 150"`,
 * which then reads as "USD 150 USD" wherever the UI appends the currency code.
 * Callers add the " USD" suffix themselves.
 *
 * Returns `null` for quote-based services so callers must handle that case
 * explicitly instead of rendering "$0".
 */
export function formatPrice(priceCents: number | null): string | null {
  if (priceCents === null) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(priceCents / 100);
}
