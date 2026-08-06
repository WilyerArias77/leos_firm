import { INITIAL_CONSULTATION } from "@/constants/business";
import type { PricingModel, Service } from "@/types/content.types";

/**
 * How each pricing model is announced to the visitor (ADR-009).
 *
 * Kept next to the catalog and out of the components so the client can reword
 * what the $50 means without anyone touching JSX (Mandamiento II). `label` is
 * `null` when there is nothing to clarify: the price simply is the price.
 */
export const PRICING_COPY: Record<PricingModel, { label: string | null; note: string }> = {
  "full-service": {
    label: null,
    note: "Precio cerrado del servicio.",
  },
  deposit: {
    // Short: it renders inside a Badge next to the price.
    label: "Abono al total",
    note:
      "Este pago aparta tu cita y se descuenta completo del costo del servicio. " +
      "No es el precio del servicio: Claudia te dice cuánto es durante la llamada, " +
      "porque el costo depende de tu caso.",
  },
};

/**
 * Notice requested by the client, 2026-08-06, word for word.
 *
 * Shown above the catalog and inside the diagnosis card of every service page.
 * It says the same thing as `PRICING_COPY.deposit.note` in one line, and the
 * client wants it visible before the visitor opens any service.
 */
export const DEPOSIT_NOTICE =
  "El valor cancelado para la consulta será tomado como abono para el servicio contratado.";

/**
 * Service catalog — source: `context.md` §5.
 *
 * Temporary home for the catalog until it moves to a database. Shape matches
 * `docs/DB_SCHEMA.md` so the migration is a one-function change inside
 * `service.service.ts`.
 *
 * Prices are in USD cents (ADR-006) and every service has one (ADR-009):
 *
 * - Two services carry their own closed price and `full-service` pricing —
 *   paying closes the service.
 * - The other six charge `INITIAL_CONSULTATION.priceCents` as a `deposit`: it
 *   **holds the appointment** and comes off the real cost of the service in full.
 *   It is not a cheaper version of the service and it is not a product of its
 *   own. Their final price depends on the case, which is exactly why Claudia
 *   quotes it live and it is not printed here.
 *
 * There is no unpriced path any more: a visitor who finishes the diagnosis
 * always lands on the same schedule-and-pay flow.
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
    pricingModel: "full-service",
    durationMinutes: 60,
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
      "Preparación y presentación de las elecciones fiscales aplicables a tu empresa en Estados Unidos. Es un trámite puntual: se ejecuta sobre una estructura que ya existe y cuyas necesidades ya están definidas. Empieza con una sesión en la que se confirma qué elecciones corresponden a tu caso antes de presentar nada.",
    priceCents: 25_000,
    pricingModel: "full-service",
    durationMinutes: 60,
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
    priceCents: INITIAL_CONSULTATION.priceCents,
    pricingModel: "deposit",
    durationMinutes: INITIAL_CONSULTATION.durationMinutes,
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
    priceCents: INITIAL_CONSULTATION.priceCents,
    pricingModel: "deposit",
    durationMinutes: INITIAL_CONSULTATION.durationMinutes,
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
    priceCents: INITIAL_CONSULTATION.priceCents,
    pricingModel: "deposit",
    durationMinutes: INITIAL_CONSULTATION.durationMinutes,
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
    priceCents: INITIAL_CONSULTATION.priceCents,
    pricingModel: "deposit",
    durationMinutes: INITIAL_CONSULTATION.durationMinutes,
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
    priceCents: INITIAL_CONSULTATION.priceCents,
    pricingModel: "deposit",
    durationMinutes: INITIAL_CONSULTATION.durationMinutes,
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
    priceCents: INITIAL_CONSULTATION.priceCents,
    pricingModel: "deposit",
    durationMinutes: INITIAL_CONSULTATION.durationMinutes,
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
