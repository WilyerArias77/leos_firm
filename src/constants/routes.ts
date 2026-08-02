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
  checkout: "/api/v1/checkout",
  squareWebhook: "/api/v1/webhooks/square",
  intake: "/api/v1/intake",
  availability: "/api/v1/availability",
  appointments: "/api/v1/appointments",
} as const;
