import { API_ROUTES } from "@/constants/routes";
import { appointmentSchema } from "@/lib/validation/appointment.schema";
import { toFieldErrors } from "@/lib/validation/lead.schema";
import type { AppointmentPayload } from "@/lib/validation/appointment.schema";
import type { CalendarDay } from "@/lib/utils/timezone";
import type { AppointmentHold, AvailabilityResult, Slot } from "@/types/scheduling.types";

/**
 * The browser's side of scheduling: talks to OUR API, never to n8n.
 *
 * Lives here and not inside the calendar components because a component never
 * talks to a data source directly (Mandamiento II). Mirrors `lead.service.ts`.
 */

export type AvailabilityFetch =
  | { ok: true; result: AvailabilityResult }
  | { ok: false; message: string };

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  details?: Record<string, string>;
};

/**
 * Free slots for a range of days.
 *
 * Takes an `AbortSignal` because paging through months fires one request per
 * click, and a slow answer for August must never overwrite a fresh one for
 * September.
 */
export async function fetchAvailability(
  params: { from: CalendarDay; to: CalendarDay; timeZone: string; serviceSlug?: string },
  signal?: AbortSignal,
): Promise<AvailabilityFetch> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    tz: params.timeZone,
  });

  if (params.serviceSlug) query.set("servicio", params.serviceSlug);

  try {
    const response = await fetch(`${API_ROUTES.availability}?${query.toString()}`, { signal });
    const body: ApiEnvelope<AvailabilityResult> = await response.json().catch(() => ({}));

    if (!response.ok || !body.data) {
      return {
        ok: false,
        message: body.message ?? "No pudimos consultar la agenda en este momento.",
      };
    }

    return { ok: true, result: body.data };
  } catch (error) {
    // An aborted request is not a failure — it is the previous month being
    // discarded on purpose. The caller ignores this branch.
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, message: "" };
    }

    return { ok: false, message: "No pudimos conectar con el servidor." };
  }
}

export type AppointmentSubmission =
  | { ok: true; hold: AppointmentHold }
  | { ok: false; message: string; fieldErrors?: Record<string, string>; alternatives?: Slot[] };

/**
 * Holds the chosen slot.
 *
 * Runs the same Zod schema the server runs — here for instant feedback, there
 * because it is the only verdict that counts (`docs/03-security.md`).
 */
export async function createAppointment(
  payload: AppointmentPayload,
): Promise<AppointmentSubmission> {
  const parsed = appointmentSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los datos antes de confirmar.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const response = await fetch(API_ROUTES.appointments, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const body: ApiEnvelope<AppointmentHold & { alternatives?: Slot[] }> = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message: body.message ?? "No pudimos apartar ese horario.",
        fieldErrors: body.details,
        // Sent with a 409: the slot went while the form was being filled in.
        alternatives: body.data?.alternatives,
      };
    }

    if (!body.data) {
      return { ok: false, message: "No pudimos apartar ese horario." };
    }

    return { ok: true, hold: body.data };
  } catch {
    return { ok: false, message: "No pudimos conectar con el servidor." };
  }
}
