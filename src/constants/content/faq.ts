import type { FaqItem } from "@/types/content.types";

/**
 * Frequently asked questions — questions from `context.md` §9, official answers
 * written by Claudia Leos and delivered on 2026-08-03.
 *
 * ⚠️ These are tax and immigration statements: an invented answer would be a
 * real liability for the firm. Never edit the wording without the firm's
 * approval, and never add a question here without its official answer.
 */
export const FAQ: readonly FaqItem[] = [
  {
    question: "¿Puedo abrir una empresa en Estados Unidos sin vivir ahí?",
    answer:
      "Sí. No es necesario ser ciudadano estadounidense ni residir en Estados Unidos para crear una empresa. Los inversionistas extranjeros pueden constituir una LLC o una Corporación y operar legalmente, siempre que cumplan con las obligaciones fiscales y legales correspondientes.",
  },
  {
    question: "¿Necesito una visa para tener una LLC?",
    answer:
      "No. La creación de una LLC no requiere una visa estadounidense. Sin embargo, ser propietario de una empresa no otorga automáticamente el derecho a vivir o trabajar en Estados Unidos. Si tu objetivo es emigrar o administrar tu negocio desde el país, existen opciones de visas que pueden evaluarse según tu situación.",
  },
  {
    question: "¿Qué estructura empresarial me conviene?",
    answer:
      "Depende de tus objetivos, el tipo de actividad que realizarás, tu país de residencia, el número de socios y las implicaciones fiscales. Durante la consultoría analizamos tu caso para recomendarte la estructura que mejor proteja tus intereses y optimice tu carga fiscal.",
  },
  {
    question: "¿Qué obligaciones fiscales tiene un extranjero?",
    answer:
      "Las obligaciones varían según la estructura de la empresa, el tipo de ingresos, el país de residencia del propietario y las operaciones realizadas en Estados Unidos. Es importante cumplir oportunamente con las declaraciones informativas y fiscales para evitar multas y sanciones. En Leos Firm te orientamos para que conozcas y cumplas con todas tus obligaciones.",
  },
  {
    question: "¿Pueden ayudarme si mi LLC ya fue creada?",
    answer:
      "Sí. Podemos asesorarte aunque tu empresa ya esté constituida. Revisamos que tu LLC esté correctamente estructurada, verificamos el cumplimiento de sus obligaciones fiscales y legales, e identificamos oportunidades de mejora para reducir riesgos y mantener tu empresa en regla.",
  },
  {
    question: "¿La consultoría se realiza en español?",
    answer:
      "Sí. Todas nuestras consultorías se ofrecen completamente en español, utilizando un lenguaje claro y sencillo para que comprendas cada aspecto legal y fiscal de tu empresa en Estados Unidos.",
  },
  {
    question: "¿El pago de la consultoría es reembolsable?",
    answer:
      "Depende de cuándo canceles. Si cancelas con 24 horas o más de anticipación, puedes recibir un reembolso menos las comisiones bancarias o de procesamiento, o dejar el monto como crédito para una consultoría futura. Con menos de 24 horas el pago ya no es reembolsable, porque el tiempo profesional quedó reservado en exclusiva para ti. Reprogramar es sin costo siempre que nos avises con al menos 24 horas. Y si somos nosotros quienes cancelamos, eliges: reprogramar sin costo o el reembolso completo.",
  },
] as const;
