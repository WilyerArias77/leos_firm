import { z } from "zod";

/**
 * Validation of a diagnosis lead — shared by the browser and the server
 * (`docs/03-security.md`: "un esquema Zod por endpoint, compartido con el
 * formulario").
 *
 * The browser runs it for instant feedback; that is UX, not security. The
 * server runs the very same schema on every request and only trusts its own
 * result.
 */

export const leadStepSchema = z.object({
  questionId: z.string().min(1).max(60),
  optionId: z.string().min(1).max(60),
});

export const leadSchema = z.object({
  /**
   * Row key of the CRM (`docs/features/crm-sheets.md`). Minted in the browser
   * when the form is submitted and carried through scheduling and payment, so
   * the three stages update ONE row instead of appending three.
   *
   * It is opaque and carries no privilege: it names a row, it does not grant
   * access to it. Nothing is read back by id.
   */
  leadId: z.string().uuid("Identificador de solicitud inválido"),

  // `.trim()` va ANTES de las validaciones a propósito: pegar un correo desde
  // otra app arrastra espacios, y rechazar "ana@ejemplo.com " por eso es
  // castigar al visitante por algo que el navegador puede arreglar solo.
  fullName: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre completo")
    .max(120, "El nombre es demasiado largo"),
  email: z
    .string()
    .trim()
    .min(1, "Escribe tu correo electrónico")
    .email("Ese correo electrónico no parece válido")
    .max(180, "El correo es demasiado largo"),
  phone: z
    .string()
    .trim()
    .min(6, "Escribe un número de contacto válido")
    .max(30, "El número es demasiado largo"),
  country: z
    .string()
    .trim()
    .min(2, "Indica tu país de residencia")
    .max(80, "El país es demasiado largo"),
  consent: z
    .boolean()
    .refine((value) => value === true, {
      message: "Necesitamos tu autorización para poder contactarte",
    }),

  /** Answers, in order. Bounded so a crafted request cannot grow unbounded. */
  steps: z.array(leadStepSchema).min(1, "Falta responder el diagnóstico").max(10),
  recommendedServiceSlug: z.string().min(1).max(80),
  /** Service being viewed when the popup opened; `null` outside a detail page. */
  viewedServiceSlug: z.string().max(80).nullable(),
  sourcePath: z.string().max(300),
});

export type LeadPayload = z.infer<typeof leadSchema>;

/**
 * Lowercases the email so the same person is one row in the CRM, not two
 * ("Ana@ejemplo.com" and "ana@ejemplo.com" are the same inbox).
 *
 * Trimming already happened inside the schema — doing it here too would have
 * been too late: validation runs first, and a trailing space would have failed
 * the email check before this function ever saw it.
 */
export function normalizeLead(payload: LeadPayload): LeadPayload {
  return { ...payload, email: payload.email.toLowerCase() };
}

/** Turns a Zod error into `{ campo: "mensaje" }` for the API `details` object. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}
