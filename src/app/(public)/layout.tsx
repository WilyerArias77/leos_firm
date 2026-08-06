import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/** Chrome shared by every public page. The admin panel has its own layout. */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/*
        Skip link (FASE 8, A11Y). First focusable element on every page, hidden
        until it takes focus. Without it a keyboard or screen-reader user has to
        walk the whole nav on each navigation before reaching the content — and
        the diagnosis popup makes that nav longer than usual.
      */}
      <a
        href="#contenido"
        className="sr-only rounded-card bg-accent px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
