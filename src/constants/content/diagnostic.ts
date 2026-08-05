import type { DiagnosticQuestion, DiagnosticQuestionId } from "@/types/diagnostic.types";

/**
 * Content of the free-diagnosis popup — `docs/features/lead-diagnostic.md`.
 *
 * This file is CONTENT, not logic. The walk through the tree lives in
 * `src/services/diagnostic.service.ts`.
 *
 * Rules for editing:
 * - Every `serviceSlug` must exist in `src/constants/content/services.ts`.
 * - `insight` texts are operational ("lo marcamos como prioritario"), never tax
 *   or legal statements. The firm's answers to fiscal questions belong in a
 *   consultation, not in a popup (Mandamiento I).
 */

export const DIAGNOSTIC_COPY = {
  eyebrow: "Diagnóstico gratuito",
  introTitle: "¿Te decimos exactamente qué necesitas?",
  introBody:
    "Son 3 preguntas rápidas. Con tus respuestas identificamos qué servicio corresponde a tu caso y cuál es el siguiente paso.",
  introBodyWithService:
    "Antes de seguir leyendo: son 3 preguntas rápidas y te decimos si este es el servicio que tu caso necesita, o si te conviene otro.",
  /** Wording requested by the client, 2026-08-03. */
  acceptLabel: "Quiero acceder al servicio",
  /** Wording requested by the client, word for word. */
  declineLabel: "No quiero mi diagnóstico gratuito, solo estoy viendo",
  /**
   * Exit available at every step (client request, 2026-08-03): the visitor can
   * close the form whenever they want and keep browsing.
   */
  dismissLabel: "Cerrar el formulario y seguir navegando",
  contactTitle: "¿A dónde te enviamos tu diagnóstico?",
  contactHelper:
    "Con estos datos Claudia puede darle seguimiento a tu caso concreto, no una respuesta genérica.",
  consentLabel:
    "Autorizo a Leos Firm LLC a contactarme por correo o teléfono sobre esta consulta.",
  submitLabel: "Enviar formulario",
  submittingLabel: "Analizando tu caso…",
  resultTitle: "Tu diagnóstico",
  backLabel: "Volver",
  errorMessage:
    "No pudimos registrar tus datos. Revisa tu conexión e inténtalo de nuevo, o llámanos directamente.",
} as const;

/**
 * Result screen.
 *
 * There is a single next step since ADR-009: agendar y pagar. The old second
 * branch — "Claudia revisa tu caso y te cotiza por correo" — no longer exists,
 * because no service is left without a price.
 *
 * `schedulingPendingLabel` and `schedulingPending` are TEMPORARY: they hold the
 * place until the scheduling screen ships. `deliveryFailed` is permanent — it
 * only shows when the CRM did not take the lead, and then the phone number is
 * the recovery path.
 */
export const DIAGNOSTIC_RESULT_COPY = {
  leadIn: "Según lo que nos contaste, esto es lo que tu caso necesita:",
  nextStepHeading: "Siguiente paso: agenda tu sesión y confirma el pago",
  nextStepBody:
    "Eliges el día y la hora directamente en la agenda de Claudia. La cita queda confirmada en cuanto se registra el pago.",
  schedulingPendingLabel: "Agendar y pagar (próximamente)",
  schedulingPending:
    "La agenda en línea se activa en los próximos días. Llámanos y agendamos tu cita ahora mismo.",
  deliveryFailed:
    "Tus datos quedaron registrados en este dispositivo, pero no pudimos enviarlos a Leos Firm. Llámanos y te atendemos con tu diagnóstico en la mano.",
  callLabel: "Llamar a Leos Firm",
  closeLabel: "Seguir explorando el sitio",
} as const;

/** First question of the tree. */
export const ROOT_QUESTION_ID: DiagnosticQuestionId = "situacion";

export const DIAGNOSTIC_QUESTIONS: readonly DiagnosticQuestion[] = [
  {
    id: "situacion",
    prompt: "Para empezar, ¿en qué punto estás hoy?",
    helper: "Elige la opción que más se parezca a tu situación.",
    options: [
      {
        id: "sin-entidad",
        label: "Todavía no tengo una empresa en Estados Unidos",
        insight:
          "Perfecto. Lo primero es definir qué estructura corresponde a tu caso, antes de constituir nada.",
        nextQuestionId: "objetivo-sin-entidad",
      },
      {
        id: "con-entidad",
        label: "Ya tengo una LLC o una Corporation",
        insight:
          "Bien. Entonces el trabajo se centra en administrarla y mantenerla en cumplimiento.",
        nextQuestionId: "objetivo-con-entidad",
      },
      {
        id: "empresa-extranjera",
        label: "Tengo una empresa fuera de EE. UU. y quiero operar allá",
        insight:
          "Ese es un caso de expansión: hay que definir cómo se relaciona la empresa de origen con la nueva operación.",
        serviceSlug: "expansion-usa",
        nextQuestionId: "urgencia",
      },
      {
        id: "atrasado",
        label: "Ya opero en EE. UU., pero estoy atrasado con mis obligaciones",
        insight:
          "Entendido. Se empieza por un diagnóstico de la situación actual y un plan de regularización.",
        serviceSlug: "regularizacion-empresas",
        nextQuestionId: "urgencia",
      },
    ],
  },
  {
    id: "objetivo-sin-entidad",
    prompt: "¿Qué necesitas resolver primero?",
    options: [
      {
        id: "crear-empresa",
        label: "Crear y estructurar mi empresa desde cero",
        insight:
          "Anotado: Soft Landing. La estructura se define antes de constituir, para no tener que corregirla después.",
        serviceSlug: "apertura-llc-soft-landing",
        nextQuestionId: "urgencia",
      },
      {
        id: "entender-obligaciones",
        label: "Entender qué obligaciones tendría antes de decidir",
        insight:
          "Anotado. Una consultoría uno a uno es el punto de partida correcto para eso.",
        serviceSlug: "consultoria-fiscal-extranjeros",
        nextQuestionId: "urgencia",
      },
      {
        id: "sin-claridad",
        label: "Todavía no lo tengo claro, necesito orientación",
        insight:
          "Sin problema: para eso existe la consultoría de evaluación. Sales de ahí con el siguiente paso definido.",
        serviceSlug: "consultoria-fiscal-extranjeros",
        nextQuestionId: "urgencia",
      },
    ],
  },
  {
    id: "objetivo-con-entidad",
    prompt: "¿Qué necesitas para tu empresa?",
    options: [
      {
        id: "contabilidad",
        label: "Llevar la contabilidad mensual y tener reportes financieros",
        insight: "Anotado: bookkeeping mensual con entrega de reportes.",
        serviceSlug: "bookkeeping",
        nextQuestionId: "urgencia",
      },
      {
        id: "nomina",
        label: "Pagar nómina a mis empleados",
        insight:
          "Anotado: payroll. Las obligaciones dependen de tu estado y del tipo de entidad.",
        serviceSlug: "payroll",
        nextQuestionId: "urgencia",
      },
      {
        id: "sales-tax",
        label: "Cumplir con el Sales Tax y las obligaciones de mi estado",
        insight:
          "Anotado. Cada estado tiene reglas distintas; primero se define cuáles te corresponden.",
        serviceSlug: "sales-tax",
        nextQuestionId: "urgencia",
      },
      {
        id: "elecciones",
        label: "Presentar elecciones fiscales",
        insight:
          "Anotado: es un trámite puntual sobre una estructura que ya existe.",
        serviceSlug: "elecciones-fiscales",
        nextQuestionId: "urgencia",
      },
      {
        id: "revisar-estructura",
        label: "Revisar si mi estructura actual es la correcta",
        insight:
          "Anotado. Eso se revisa en una consultoría, con tu caso concreto sobre la mesa.",
        serviceSlug: "consultoria-fiscal-extranjeros",
        nextQuestionId: "urgencia",
      },
    ],
  },
  {
    id: "urgencia",
    prompt: "¿Para cuándo necesitas resolverlo?",
    helper: "Nos sirve para saber con qué prioridad damos seguimiento a tu caso.",
    options: [
      {
        id: "esta-semana",
        label: "Es urgente, esta semana",
        insight: "Lo marcamos como prioritario.",
        nextQuestionId: null,
      },
      {
        id: "este-mes",
        label: "Dentro de este mes",
        insight: "Perfecto, hay margen para hacerlo bien.",
        nextQuestionId: null,
      },
      {
        id: "explorando",
        label: "Estoy planeando, todavía sin fecha",
        insight: "Ideal: planear con tiempo es lo que evita corregir después.",
        nextQuestionId: null,
      },
    ],
  },
] as const;

/**
 * Answers to the first question that mean "already has a US entity".
 * Feeds `clients.has_us_entity` / `leads.has_us_entity` (`context.md` §7), so
 * the full intake never asks this again.
 */
export const OPTIONS_WITH_US_ENTITY: readonly string[] = ["con-entidad", "atrasado"];
