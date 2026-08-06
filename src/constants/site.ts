/**
 * The site's own public origin.
 *
 * Exists because three places need it and each one used to inline the same
 * fallback: the root layout's `metadataBase`, `robots.ts` and `sitemap.ts`. A
 * fourth reader is `src/lib/square/signature.ts`, indirectly — the webhook's HMAC
 * is computed over `notificationUrl + rawBody`, so if this value and the URL
 * registered in Square ever disagree by one character, every signature fails
 * (`docs/features/payments.md`).
 *
 * The `localhost` fallback is for `npm run dev` only. In production the variable
 * is always set, and it is verified there: a wrong value shows up as a webhook
 * that never validates, not as a broken link.
 *
 * No trailing slash — callers concatenate paths onto it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");
