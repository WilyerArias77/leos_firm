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
  fullName: z
    .string()
    .min(2, "Escribe tu nombre completo")
    .max(120, "El nombre es demasiado largo"),
  email: z
    .string()
    .min(1, "Escribe tu correo electrónico")
    .email("Ese correo electrónico no parece válido")
    .max(180, "El correo es demasiado largo"),
  phone: z
    .string()
    .min(6, "Escribe un número de contacto válido")
    .max(30, "El número es demasiado largo"),
  country: z
    .string()
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
  outcome: z.enum(["checkout", "contact"]),
  /** Service being viewed when the popup opened; `null` outside a detail page. */
  viewedServiceSlug: z.string().max(80).nullable(),
  sourcePath: z.string().max(300),
});

export type LeadPayload = z.infer<typeof leadSchema>;

/**
 * Normalizes before validating: trims everything and lowercases the email so
 * `clients.email` stays unique (`DB_SCHEMA.md` requires `email = lower(email)`).
 */
export function normalizeLead(payload: LeadPayload): LeadPayload {
  return {
    ...payload,
    fullName: payload.fullName.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    country: payload.country.trim(),
  };
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
