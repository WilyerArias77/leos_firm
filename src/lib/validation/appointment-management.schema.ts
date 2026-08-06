import { z } from "zod";

/**
 * Validation for managing an existing appointment
 * (`docs/features/appointment-management.md`).
 *
 * Shared by the browser and the server, like every other schema here: the
 * browser runs it for instant feedback, the server runs the very same one and
 * only trusts its own verdict (`docs/03-security.md`).
 *
 * What is NOT in here, deliberately: the appointment's date, the hours left and
 * the refund verdict. All three are derived on the server from the event itself
 * — a client that can write them can write itself a refund.
 */

/** Cap of the free-text field. It is a preferred time, not a letter. */
export const RESCHEDULE_PREFERENCE_MAX = 500;

/**
 * Body of `POST /api/v1/appointments/[token]/reschedule-request`.
 *
 * The text ends up inside an email in Claudia's inbox, so it is untrusted input
 * on its way to HTML (`03-security.md` § Validación de entrada). The escaping is
 * n8n's job; the ceiling is this schema's — an unbounded field is an invitation
 * to paste anything at all into someone else's mailbox.
 */
export const rescheduleRequestSchema = z.object({
  preference: z
    .string()
    .trim()
    .min(3, "Cuéntanos qué horario te viene mejor")
    .max(
      RESCHEDULE_PREFERENCE_MAX,
      `Son ${RESCHEDULE_PREFERENCE_MAX} caracteres como máximo`,
    ),
});

export type RescheduleRequestBody = z.infer<typeof rescheduleRequestSchema>;
