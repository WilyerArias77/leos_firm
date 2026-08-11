/**
 * Route map. Public routes are kebab-case in Spanish (Mandamiento XI).
 * Never hardcode a path string in a component — import it from here.
 */

export const ROUTES = {
  home: "/",
  services: "/servicios",
  service: (slug: string) => `/servicios/${slug}`,
  booking: "/agendar",
  appointment: (accessToken: string) => `/agendar/cita/${accessToken}`,
  about: "/sobre-claudia",
  faq: "/faq",
  policies: "/politicas",
  dashboard: "/dashboard",
} as const;

export const API_ROUTES = {
  health: "/api/v1/health",
  services: "/api/v1/services",
  leads: "/api/v1/leads",
  checkout: "/api/v1/checkout",
  /** Poll of the payment's state. The id is Square's opaque order id. */
  orderStatus: (orderId: string) => `/api/v1/orders/${encodeURIComponent(orderId)}/status`,
  squareWebhook: "/api/v1/webhooks/square",
  intake: "/api/v1/intake",
  availability: "/api/v1/availability",
  appointments: "/api/v1/appointments",
  /**
   * Frees an unpaid hold when the visitor walks away, instead of waiting for the
   * cleaner (2026-08-07). Takes the `eventId`, not a signed token: it can only
   * ever delete an unpaid tentative hold, and the workflow enforces that.
   */
  releaseSlot: "/api/v1/appointments/release",
  /**
   * The two actions behind the client's own appointment link (FASE 9).
   * `token` is the HMAC-signed token from the confirmation email (ADR-016).
   */
  cancelAppointment: (token: string) =>
    `/api/v1/appointments/${encodeURIComponent(token)}/cancel`,
  rescheduleRequest: (token: string) =>
    `/api/v1/appointments/${encodeURIComponent(token)}/reschedule-request`,
} as const;
