"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { COMPANY } from "@/constants/business";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "./Header.types";

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Servicios", href: ROUTES.services },
  { label: "Sobre Claudia", href: ROUTES.about },
  { label: "Preguntas frecuentes", href: ROUTES.faq },
  { label: "Políticas", href: ROUTES.policies },
] as const;

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-navy-700 bg-navy-900">
      {/* Franja del slogan: visible en todos los tamaños, por pedido de la clienta */}
      <div className="border-b border-navy-800 bg-navy-950">
        <Container>
          <p className="py-2 text-center text-[11px] leading-snug font-medium tracking-wide text-gold sm:text-sm">
            {COMPANY.slogan}
          </p>
        </Container>
      </div>

      <Container>
        <div className="flex h-20 items-center justify-between gap-4 sm:h-28">
          <Link
            href={ROUTES.home}
            className="flex items-center gap-3"
            onClick={() => setIsMenuOpen(false)}
          >
            <Image
              src="/logo.png"
              alt="Leos Firm LLC"
              width={88}
              height={88}
              priority
              className="h-16 w-16 rounded-md object-cover sm:h-[88px] sm:w-[88px]"
            />
            <span className="font-serif text-lg tracking-wide text-platinum sm:text-xl">
              Leos Firm
            </span>
          </Link>

          <nav aria-label="Navegación principal" className="hidden lg:block">
            <ul className="flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "text-sm transition-colors",
                      isActive(item.href)
                        ? "text-gold"
                        : "text-platinum-dim hover:text-platinum",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden lg:block">
            <ButtonLink href={ROUTES.services}>Agendar consultoría</ButtonLink>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="menu-movil"
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            className="rounded-md p-2 text-platinum hover:bg-navy-700 lg:hidden"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>

      {isMenuOpen ? (
        <div id="menu-movil" className="border-t border-navy-700 lg:hidden">
          <Container>
            <nav aria-label="Navegación principal móvil" className="py-4">
              <ul className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-2 py-3 text-base",
                        isActive(item.href)
                          ? "text-gold"
                          : "text-platinum-dim hover:bg-navy-700 hover:text-platinum",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonLink
                href={ROUTES.services}
                className="mt-4 w-full"
                onClick={() => setIsMenuOpen(false)}
              >
                Agendar consultoría
              </ButtonLink>
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
