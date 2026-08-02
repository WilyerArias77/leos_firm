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
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
