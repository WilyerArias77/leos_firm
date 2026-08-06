"use client";

import "./globals.css";

/**
 * Last-resort error boundary — `docs/features/public-site.md` (FASE 8).
 *
 * This one replaces the ROOT layout, so it must ship its own `<html>` and
 * `<body>`: by the time it renders, the layout that normally provides them is
 * the thing that failed. That also means no Header, no Footer and no font
 * variables — `error.tsx` covers everything less catastrophic, and this file
 * only has to stay readable.
 *
 * It deliberately holds no imports from `@/components` or `@/constants`: a module
 * that fails to evaluate could be the reason we are here, and the fallback for a
 * broken page must not be able to break the same way. The phone number is
 * inlined for that reason — the one duplication in the codebase that is a
 * feature.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-full flex-col items-center justify-center bg-navy-900 px-6 py-16 text-platinum">
        <div className="w-full max-w-xl">
          <p className="text-xs font-medium tracking-widest text-gold uppercase">
            Error del servidor
          </p>
          <h1 className="mt-4 text-3xl sm:text-4xl">No pudimos cargar el sitio</h1>
          <p className="mt-5 text-lg leading-relaxed text-platinum-dim">
            Es un problema nuestro y ya quedó registrado. Si estabas agendando una cita,
            tu horario sigue apartado.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-card bg-accent px-7 py-3.5 text-base font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Volver a intentar
            </button>
            <a
              href="tel:+12106307878"
              className="inline-flex items-center justify-center rounded-card border border-platinum/30 px-7 py-3.5 text-base font-medium text-platinum transition-colors hover:bg-navy-700"
            >
              Llamar al (210) 630 7878
            </a>
          </div>

          {error.digest ? (
            <p className="mt-10 text-sm text-platinum-dim">
              Código de referencia: <code>{error.digest}</code>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
