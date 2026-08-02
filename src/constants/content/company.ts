import type { CompanyValue } from "@/types/content.types";

/** Source: `context.md` §3. Verbatim — not rewritten. */
export const MISSION =
  "Empoderar a empresarios e inversionistas para establecer, proteger y expandir sus negocios en Estados Unidos mediante estrategias claras, cumplimiento fiscal y acompañamiento personalizado, transformando la incertidumbre en oportunidades de crecimiento.";

export const VISION =
  "Ser la firma de consultoría internacional de referencia para los empresarios hispanos que desean construir negocios sólidos y patrimonio en Estados Unidos, reconocida por su excelencia, integridad y resultados duraderos.";

export const VALUES: readonly CompanyValue[] = [
  { name: "Integridad", description: "Siempre hacemos lo correcto." },
  {
    name: "Impacto",
    description:
      "Nuestro éxito se mide por el crecimiento y la tranquilidad que logramos generar en nuestros clientes.",
  },
  {
    name: "Excelencia",
    description:
      "Cada estrategia, trámite y recomendación se ejecuta con el más alto nivel profesional.",
  },
  {
    name: "Compromiso",
    description: "Tratamos el negocio de nuestros clientes como si fuera nuestro.",
  },
  {
    name: "Educación",
    description:
      "Creemos que un empresario informado toma mejores decisiones y construye empresas más fuertes.",
  },
  {
    name: "Innovación",
    description: "Utilizamos la tecnología para ofrecer servicios de manera ágil y oportuna.",
  },
  {
    name: "Transparencia",
    description: "Comunicación clara, expectativas realistas y compromiso total.",
  },
] as const;

/** Source: `context.md` §2. */
export const FOUNDER = {
  name: "Claudia Leos",
  title: "CEO, CP, MF",
  role: "Consultora Internacional de Negocios y Contadora Pública México-Americana",
  bio: "Claudia Leos es Consultora Internacional de Negocios y Contadora Pública México-Americana con experiencia profesional tanto en México como en Estados Unidos. Ayuda a empresarios, inversionistas y familias internacionales a establecer y administrar correctamente sus negocios en Estados Unidos, integrando estrategia empresarial, estructura fiscal, cumplimiento y acompañamiento personalizado.",
  differentiator:
    "Su conocimiento bicultural. No solo conoce cómo funcionan las empresas en Estados Unidos, sino que también entiende el entorno fiscal y empresarial de México, lo que le permite ofrecer recomendaciones integrales a empresarios que operan entre ambos países.",
  quote: "Una contadora en San Antonio que también es contadora en México.",
} as const;

/** Source: `context.md` §4. */
export const TARGET_AUDIENCE: readonly string[] = [
  "Empresarios e inversionistas extranjeros",
  "Personas que ya tienen una LLC constituida",
  "Empresas que desean expandirse a Estados Unidos",
  "Negocios que necesitan regularizar sus obligaciones fiscales en EE. UU.",
  "Profesionistas e inversionistas que necesitan una estructura empresarial correcta, muchas veces en proceso de visas de inversionista",
] as const;

/** Where clients are located — `context.md` §4. */
export const CLIENT_LOCATIONS: readonly string[] = [
  "Miami",
  "California",
  "Texas",
  "México",
  "España",
  "Latinoamérica",
] as const;
