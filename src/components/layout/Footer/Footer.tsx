import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { COMPANY } from "@/constants/business";
import { ROUTES } from "@/constants/routes";

const FOOTER_LINKS = [
  { label: "Servicios", href: ROUTES.services },
  { label: "Sobre Claudia", href: ROUTES.about },
  { label: "Preguntas frecuentes", href: ROUTES.faq },
  { label: "Política de cancelación", href: ROUTES.policies },
] as const;

/** Phone number stripped of formatting, for the `tel:` link. */
const PHONE_HREF = `tel:+1${COMPANY.phone.replace(/\D/g, "")}`;

export function Footer() {
  return (
    <footer className="border-t border-navy-700 bg-navy-950 text-platinum-dim">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-serif text-xl text-platinum">{COMPANY.legalName}</p>
            <p className="mt-1 text-xs tracking-widest uppercase">
              Servicios Empresariales y Contables
            </p>
            <p className="mt-4 text-sm leading-relaxed">
              México <span className="text-gold">|</span> Estados Unidos
            </p>
          </div>

          <div>
            <h2 className="font-sans text-sm font-medium tracking-wide text-platinum">
              Contacto
            </h2>
            <address className="mt-4 space-y-3 text-sm not-italic">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{COMPANY.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <a href={PHONE_HREF} className="hover:text-platinum">
                  {COMPANY.phone}
                </a>
              </p>
            </address>
          </div>

          <nav aria-label="Enlaces del pie de página">
            <h2 className="font-sans text-sm font-medium tracking-wide text-platinum">
              Navegación
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-platinum">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-navy-700 py-6">
          <p className="text-xs">
            © {new Date().getFullYear()} {COMPANY.legalName}. Todos los derechos reservados.
          </p>
        </div>
      </Container>
    </footer>
  );
}
