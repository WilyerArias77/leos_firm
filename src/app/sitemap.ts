import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";
import { ROUTES } from "@/constants/routes";
import { getServiceSlugs } from "@/services/service.service";

/**
 * `/sitemap.xml` — `docs/features/public-site.md` (FASE 8).
 *
 * The service pages come from the catalog through `getServiceSlugs`, the same
 * source `generateStaticParams` uses, so a new service appears in the sitemap the
 * moment it is prerendered — there is no second list to forget to update
 * (Mandamiento XI). When the catalog moves off `src/constants/content/`, this
 * file does not change.
 *
 * `/agendar` is intentionally absent. It only means anything with a lead and a
 * held slot in the URL's state; indexed on its own it is a dead end that competes
 * with the service pages, which are the real entry points.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getServiceSlugs();
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}${ROUTES.home}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}${ROUTES.services}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // The eight service pages are what people actually search for, so they rank
    // just under the catalog and above the institutional pages.
    ...slugs.map((slug) => ({
      url: `${SITE_URL}${ROUTES.service(slug)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${SITE_URL}${ROUTES.about}`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}${ROUTES.faq}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}${ROUTES.policies}`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
