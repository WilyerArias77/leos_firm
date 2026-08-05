import { z } from "zod";
import { isValidTimeZone } from "@/lib/utils/timezone";

/**
 * Validation for scheduling — shared by the browser and the server, like
 * `lead.schema.ts` (`docs/03-security.md`).
 *
 * The browser runs it for instant feedback; that is UX. The server runs the
 * very same schema and only trusts its own verdict. What the server does NOT
 * take from the client at all: the price, the service name, the appointment's
 * duration, `policy_accepted_at` and the IP. Those are read or stamped on the
 * server (ADR-006) — a field the client can write is not evidence.
 */

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** ISO-8601 in UTC, which is the only form this API emits or accepts. */
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const calendarDay = z
  .string()
  .regex(CALENDAR_DAY, "Formato de fecha inválido")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Esa fecha no existe");

/**
 * Written out instead of using `z.iso.datetime()` so the rule is visible and
 * the message is in Spanish: the string must be UTC. Accepting a zoned offset
 * here would let the browser decide what "9:00" means.
 */
const utcInstant = z
  .string()
  .regex(UTC_INSTANT, "La hora debe venir en UTC")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Esa hora no existe");

const timeZone = z
  .string()
  .min(1)
  .max(80)
  .refine(isValidTimeZone, "No reconocemos esa zona horaria");

/** Query of `GET /api/v1/availability`. Everything arrives as a string. */
export const availabilityQuerySchema = z.object({
  from: calendarDay,
  to: calendarDay,
  /** Visitor's zone. Optional: without it, everything is shown in Central. */
  tz: timeZone.optional(),
  /** Sets the slot length from the catalog. Optional — defaults to 60 min. */
  servicio: z.string().min(1).max(80).optional(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

/**
 * Body of `POST /api/v1/appointments`.
 *
 * The contact fields are repeated here even though the CRM already has them:
 * Next.js never reads the sheet back (`crm-sheets.md`), and the tentative
 * Calendar event needs a human name on it or Claudia sees a UUID.
 */
export const appointmentSchema = z.object({
  /** Row key of the CRM. Ties this appointment to the diagnosis (ADR-008). */
  leadId: z.string().uuid("Identificador de solicitud inválido"),
  serviceSlug: z.string().min(1).max(80),

  startUtc: utcInstant,
  clientTimezone: timeZone,

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

  /**
   * Acceptance of the cancellation policy (`context.md` §8.9).
   *
   * Only the boolean travels. `policy_accepted_at` and the IP are stamped by
   * the server when it receives this — exactly like `consent_at` /
   * `consent_ip` in `buildLeadRow`.
   */
  policyAccepted: z.literal(true, {
    message: "Necesitamos que aceptes la política de cancelación",
  }),
});

export type AppointmentPayload = z.infer<typeof appointmentSchema>;

/** Lowercases the email so the CRM keeps one row per person, not two. */
export function normalizeAppointment(payload: AppointmentPayload): AppointmentPayload {
  return { ...payload, email: payload.email.toLowerCase() };
}
