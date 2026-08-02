import type { Service } from "@/types/content.types";

/**
 * Service catalog — source: `context.md` §5.
 *
 * Temporary home for the catalog until the `services` table exists (FASE 3).
 * Shape matches `docs/DB_SCHEMA.md` so the migration is a one-function change
 * inside `service.service.ts`.
 *
 * Prices are in USD cents (ADR-006). `null` means the price depends on the
 * case and requires a prior consultation — never render it as $0.
 */
export const SERVICES: readonly Service[] = [
  {
    slug: "consultoria-fiscal-extranjeros",
    name: "Consultoría fiscal para empresarios extranjeros",
    shortDescription:
      "Sesión uno a uno para entender tu situación fiscal en Estados Unidos y definir el siguiente paso con claridad.",
    longDescription:
      "Una consultoría enfocada en empresarios e inversionistas extranjeros que necesitan entender sus obligaciones fiscales en Estados Unidos. Revisamos tu caso concreto, las implicaciones entre tu país de residencia y EE. UU., y salimos con una recomendación clara sobre cómo estructurar o regularizar tu operación.",
    priceCents: 15_000,
    durationMinutes: 60,
    requiresAppointment: true,
    isSubscription: false,
    includes: [
      "Revisión de tu situación actual",
      "Recomendación de estructura fiscal",
      "Resumen de la sesión por correo",
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    slug: "elecciones-fiscales",
    name: "Elecciones fiscales",
    shortDescription:
      "Trámite puntual para presentar las elecciones fiscales que corresponden a tu entidad.",
    longDescription:
      "Preparación y presentación de las elecciones fiscales aplicables a tu empresa en Estados Unidos. Es un trámite puntual: se ejecuta sobre una estructura que ya existe y cuyas necesidades ya están definidas.",
    priceCents: 25_000,
    durationMinutes: null,
    requiresAppointment: false,
    isSubscription: false,
    includes: ["Preparación del trámite", "Presentación ante la autoridad correspondiente"],
    displayOrder: 2,
    isActive: true,
  },
  {
    slug: "apertura-llc-soft-landing",
    name: "Apertura y estructuración de LLC y Corporations",
    shortDescription:
      "Soft Landing: creamos y estructuramos correctamente tu empresa en Estados Unidos desde el inicio.",
    longDescription:
      "Acompañamiento completo para extranjeros que necesitan crear y estructurar una empresa en Estados Unidos. No se trata solo de registrar una entidad: se define la estructura que corresponde a tu operación, tus socios y tus objetivos fiscales, para no tener que corregirla después.",
    priceCents: null,
    durationMinutes: 60,
    requiresAppointment: true,
    isSubscription: false,
    includes: [
      "Definición de la estructura adecuada",
      "Constitución de la entidad",
      "Acompañamiento en el proceso completo",
    ],
    displayOrder: 3,
    isActive: true,
  },
  {
    slug: "bookkeeping",
    name: "Bookkeeping y reportes financieros",
    shortDescription:
      "Contabilidad mes a mes para empresas en operación, con reportes financieros al día.",
    longDescription:
      "Manejo contable mensual para empresas que ya están operando en Estados Unidos, con entrega de reportes financieros. Se contrata por suscripción con cobro automático y una cuota inicial de configuración (set-up).",
    priceCents: null,
    durationMinutes: 60,
    requiresAppointment: true,
    isSubscription: true,
    includes: [
      "Contabilidad mensual",
      "Reportes financieros",
      "Suscripción con cobro automático",
    ],
    displayOrder: 4,
    isActive: true,
  },
  {
    slug: "payroll",
    name: "Payroll (nómina)",
    shortDescription: "Administración de la nómina de tu empresa en Estados Unidos.",
    longDescription:
      "Gestión de la nómina para empresas con empleados en Estados Unidos, cumpliendo con las obligaciones que corresponden a tu estado y a tu tipo de entidad.",
    priceCents: null,
    durationMinutes: 60,
    requiresAppointment: true,
    isSubscription: true,
    includes: ["Procesamiento de nómina", "Cumplimiento de obligaciones asociadas"],
    displayOrder: 5,
    isActive: true,
  },
  {
    slug: "sales-tax",
    name: "Sales Tax y cumplimiento estatal",
    shortDescription:
      "Registro, cálculo y presentación del impuesto sobre ventas, según tu estado.",
    longDescription:
      "Cumplimiento del Sales Tax y de las obligaciones estatales que aplican a tu operación. Cada estado tiene reglas distintas: definimos cuáles te corresponden y mantenemos la empresa al día.",
    priceCents: null,
    durationMinutes: 60,
    requiresAppointment: true,
    isSubscription: true,
    includes: ["Determinación de obligaciones estatales", "Presentaciones periódicas"],
    displayOrder: 6,
    isActive: true,
  },
  {
    slug: "regularizacion-empresas",
    name: "Regularización de empresas existentes",
    shortDescription:
      "Para empresas que ya existen pero no están al día con sus obligaciones en Estados Unidos.",
    longDescription:
      "Diagnóstico y regularización de empresas ya constituidas que se atrasaron en sus obligaciones fiscales o que fueron estructuradas sin considerar sus implicaciones. Ordenamos la situación y dejamos la entidad en cumplimiento.",
    priceCents: null,
    durationMinutes: 60,
    requiresAppointment: true,
    isSubscription: false,
    includes: [
      "Diagnóstico de la situación actual",
      "Plan de regularización",
      "Ejecución acompañada",
    ],
    displayOrder: 7,
    isActive: true,
  },
  {
    slug: "expansion-usa",
    name: "Expansión de empresas extranjeras a Estados Unidos",
    shortDescription:
      "Para empresas ya consolidadas fuera de EE. UU. que quieren operar formalmente en el país.",
    longDescription:
      "Acompañamiento a empresas extranjeras que quieren expandir su operación a Estados Unidos: qué estructura conviene, cómo se relaciona con la empresa de origen y qué obligaciones nacen de esa decisión.",
    priceCents: null,
    durationMinutes: 60,
    requiresAppointment: true,
    isSubscription: false,
    includes: [
      "Análisis de la operación actual",
      "Estructura recomendada para EE. UU.",
      "Acompañamiento en la implementación",
    ],
    displayOrder: 8,
    isActive: true,
  },
] as const;
