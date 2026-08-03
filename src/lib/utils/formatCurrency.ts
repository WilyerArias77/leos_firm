/**
 * Formats a cents amount as USD — e.g. `15000` → `"$150"`.
 *
 * Uses `en-US` deliberately: the `es-MX` locale renders USD as `"USD 150"`,
 * which then reads as "USD 150 USD" wherever the UI appends the currency code.
 * Callers add the " USD" suffix themselves.
 *
 * Returns `null` for quote-based services so callers must handle that case
 * explicitly instead of rendering "$0".
 *
 * Lives in `lib/utils` and not in `service.service.ts` so Client Components can
 * import it without pulling in the data layer — which in FASE 6 becomes a
 * server-only Supabase client.
 */
export function formatPrice(priceCents: number | null): string | null {
  if (priceCents === null) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(priceCents / 100);
}
