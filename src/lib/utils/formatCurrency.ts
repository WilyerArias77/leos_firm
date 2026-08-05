/**
 * Formats a cents amount as USD — e.g. `15000` → `"$150"`.
 *
 * Uses `en-US` deliberately: the `es-MX` locale renders USD as `"USD 150"`,
 * which then reads as "USD 150 USD" wherever the UI appends the currency code.
 * Callers add the " USD" suffix themselves.
 *
 * Every service is priced since ADR-009, so this always returns a string. It
 * used to return `null` for quote-based services; that branch is gone along
 * with the services that needed it.
 *
 * Lives in `lib/utils` and not in `service.service.ts` so Client Components can
 * import it without pulling in the data layer.
 */
export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(priceCents / 100);
}
