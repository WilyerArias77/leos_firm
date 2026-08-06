import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";

/**
 * `/robots.txt` — `docs/features/public-site.md` (FASE 8).
 *
 * What is disallowed matters more than what is allowed:
 *
 * - `/api/` — endpoints, not pages. A crawler hitting `POST`-only routes gets
 *   405s that look like errors in Search Console, and `/api/v1/orders/…/status`
 *   would be crawled with real order ids if one ever leaked into a link.
 * - `/agendar/cita/` — a visitor's own appointment, reachable by access token
 *   (ADR-001). Indexing it would publish the token.
 * - `/dashboard` — reserved for the admin panel.
 *
 * `/agendar` itself stays crawlable: it is the entry point of the funnel.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/agendar/cita/", "/dashboard"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
