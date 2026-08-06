import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { SITE_URL } from "@/constants/site";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const headingFont = Source_Serif_4({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const TITLE_DEFAULT = "Leos Firm LLC — Servicios Empresariales y Contables";
const DESCRIPTION =
  "No abrimos empresas. Construimos el puente para que los empresarios conviertan " +
  "sus proyectos en negocios exitosos en Estados Unidos.";

export const metadata: Metadata = {
  title: {
    default: TITLE_DEFAULT,
    template: "%s | Leos Firm LLC",
  },
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),

  /**
   * Every page inherits these and each one overrides `title` and `description`
   * through its own `metadata`, so a shared card here is never wrong — only less
   * specific. Written out rather than left to Next's defaults because a link
   * pasted into WhatsApp is how most of this audience arrives, and without
   * `openGraph` it renders as a bare URL.
   */
  openGraph: {
    type: "website",
    locale: "es_US",
    siteName: "Leos Firm LLC",
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },

  // The firm operates from San Antonio and the audience searches in Spanish; the
  // canonical is absolute so a preview deployment cannot outrank production.
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
