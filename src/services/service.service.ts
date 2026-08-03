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
 * Re-exported so existing callers keep importing it from here. The
 * implementation moved to `lib/utils/formatCurrency.ts` because Client
 * Components need it, and in FASE 6 this module starts importing a
 * server-only Supabase client.
 */
export { formatPrice } from "@/lib/utils/formatCurrency";
