import Image from "next/image";
import { COMPANY } from "@/constants/business";

/**
 * Placeholder for FASE 1.
 *
 * Its only job is to prove the design tokens and the layout render correctly.
 * FASE 2 replaces it with the real home page — do not grow this file into one.
 */
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-navy-900 px-6 py-20 text-platinum">
      <Image
        src="/logo.png"
        alt="Leos Firm LLC — Servicios Empresariales y Contables"
        width={280}
        height={280}
        priority
        className="h-auto w-[220px] rounded-card sm:w-[280px]"
      />

      <p className="mt-10 max-w-2xl text-center font-serif text-xl leading-relaxed text-platinum sm:text-2xl">
        {COMPANY.tagline}
      </p>

      <div className="mt-10 h-px w-40 bg-gold" aria-hidden="true" />

      <p className="mt-10 text-sm tracking-widest text-platinum-dim uppercase">
        Sitio en construcción
      </p>
      <p className="mt-2 text-center text-sm text-platinum-dim">
        Fase 1 completada — documentación y estructura base.
      </p>
    </main>
  );
}
