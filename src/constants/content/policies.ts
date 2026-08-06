import type { PolicyItem } from "@/types/content.types";

/**
 * Cancellation and rescheduling policy — source: `context.md` §8, verbatim.
 *
 * These texts are what the client accepts in the intake form (FASE 4), and the
 * acceptance is recorded with timestamp and IP as evidence. Any change here is
 * a change to what clients legally agreed to — never reword casually.
 */
export const POLICY_INTRO =
  "Con el fin de respetar el tiempo de todos nuestros clientes y mantener una agenda organizada, se aplican las siguientes políticas para todas las consultorías:";

export const CANCELLATION_POLICY_ITEMS: readonly PolicyItem[] = [
  {
    title: "Confirmación de la cita",
    description:
      "Las citas quedan confirmadas únicamente después de haber recibido el pago correspondiente o el anticipo establecido por Leos Firm.",
  },
  {
    title: "Reprogramación",
    description:
      "Las citas pueden reprogramarse sin costo cuando la solicitud se realice con al menos 24 horas de anticipación. La nueva fecha estará sujeta a la disponibilidad de la agenda.",
  },
  {
    title: "Cancelaciones con 24 horas o más de anticipación",
    description:
      "Podrán recibir un reembolso, menos las comisiones bancarias o de procesamiento si aplican, o utilizar el monto pagado como crédito para una futura consultoría.",
  },
  {
    title: "Cancelaciones con menos de 24 horas de anticipación",
    description: "No serán reembolsables.",
  },
  {
    title: "No presentación (No-Show)",
    description:
      "Si el cliente no se presenta o se conecta con más de 15 minutos de retraso sin previo aviso, la consultoría se considerará realizada. No habrá reembolso ni reprogramación.",
  },
  {
    title: "Retrasos",
    description:
      "Se otorgará un período de gracia de hasta 15 minutos. Si el cliente llega tarde, la sesión terminará a la hora originalmente programada para no afectar las citas posteriores.",
  },
  {
    title: "Cancelaciones por parte de Leos Firm",
    description:
      "Si por alguna causa la firma necesita cancelar, el cliente podrá elegir entre reprogramar sin costo o recibir el reembolso completo.",
  },
  {
    title: "Casos de fuerza mayor",
    description:
      "Situaciones extraordinarias podrán evaluarse individualmente. Leos Firm se reserva el derecho de hacer excepciones justificadas.",
  },
  {
    title: "Aceptación de la política",
    description:
      "Al reservar y realizar el pago, el cliente confirma que ha leído, comprendido y acepta estas políticas.",
  },
  {
    title: "Consultoría ya iniciada",
    description:
      "Una vez iniciada la consultoría, el servicio se considera prestado y el pago no es reembolsable. Las cancelaciones anteriores a la cita se rigen por los plazos indicados arriba.",
  },
] as const;

/** Fields the client must complete before the consultation — `context.md` §7. */
export const INTAKE_REQUIREMENTS: readonly string[] = [
  "Nombre completo",
  "Número de contacto",
  "Correo electrónico",
  "País de residencia actual",
  "Si ya tienes una entidad constituida en EE. UU. (LLC o INC): estado de registro, actividad principal, elecciones fiscales previas y antigüedad de la entidad",
  "Si aún no tienes entidad: el motivo de tu consulta",
  "Documentos adjuntos, si aplican",
  "Aceptación de la política de cancelación",
] as const;
