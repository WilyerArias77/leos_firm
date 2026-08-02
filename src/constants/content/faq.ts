import type { FaqItem } from "@/types/content.types";

/**
 * Frequently asked questions — source: `context.md` §9.
 *
 * ⚠️ The source lists the QUESTIONS only, with no answers. These are tax and
 * immigration statements: an invented answer would be a real liability for the
 * firm, so `answer` stays `null` until Claudia writes the official copy.
 * The UI renders pending questions as such — it never fabricates a reply.
 */
export const FAQ: readonly FaqItem[] = [
  { question: "¿Puedo abrir una empresa en Estados Unidos sin vivir ahí?", answer: null },
  { question: "¿Necesito una visa para tener una LLC?", answer: null },
  { question: "¿Qué estructura empresarial me conviene?", answer: null },
  { question: "¿Qué obligaciones fiscales tiene un extranjero?", answer: null },
  { question: "¿Pueden ayudarme si mi LLC ya fue creada?", answer: null },
  { question: "¿La consultoría se realiza en español?", answer: null },
  { question: "¿El pago de la consultoría es reembolsable?", answer: null },
] as const;
