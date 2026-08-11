import { API_ROUTES } from "@/constants/routes";
import { appointmentSchema } from "@/lib/validation/appointment.schema";
import {
  rescheduleMoveSchema,
  rescheduleRequestSchema,
} from "@/lib/validation/appointment-management.schema";
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

/**
 * Managing an appointment that already exists (FASE 9 —
 * `docs/features/appointment-management.md`).
 *
 * Both calls carry the signed token in the PATH and nothing in the body that
 * decides anything: the server re-verifies the signature, re-reads the
 * appointment and re-applies `context.md` §8 on its own clock. The browser is
 * a button, not a source of truth.
 */

export type AppointmentActionResult =
  | { ok: true; alreadyDone: boolean }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Cancels the appointment. No refund is issued anywhere in this path. */
export async function cancelAppointmentByToken(
  token: string,
): Promise<AppointmentActionResult> {
  return postAction(API_ROUTES.cancelAppointment(token), undefined, {
    fallback: "No pudimos cancelar tu cita. Sigue en pie.",
    alreadyDoneKey: "alreadyCancelled",
  });
}

/**
 * Asks Claudia for another time. **Nothing is rescheduled by this call** — the
 * appointment stands until she answers, and the screen says so.
 */
export async function requestRescheduleByToken(
  token: string,
  preference: string,
): Promise<AppointmentActionResult> {
  const parsed = rescheduleRequestSchema.safeParse({ preference });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa lo que escribiste antes de enviarlo.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  return postAction(API_ROUTES.rescheduleRequest(token), parsed.data, {
    fallback: "No pudimos enviar tu solicitud.",
  });
}

export type RescheduleMoveResult =
  | { ok: true; movedTo: string; meetingUrl: string }
  /** The hour went while they were choosing. `alternatives` is that day, redrawn. */
  | { ok: false; message: string; alternatives?: Slot[] };

/**
 * Moves the appointment to another hour (ADR-019). **This one really does it**,
 * unlike `requestRescheduleByToken` above.
 *
 * A refusal is never the end of the road: below 24 h, past the limit, or if the
 * slot went, the caller still has the email path. The message says which.
 */
export async function rescheduleAppointmentByToken(
  token: string,
  newStartUtc: string,
): Promise<RescheduleMoveResult> {
  const parsed = rescheduleMoveSchema.safeParse({ newStartUtc });

  if (!parsed.success) {
    return { ok: false, message: "Elige un horario de la lista antes de continuar." };
  }

  try {
    const response = await fetch(API_ROUTES.rescheduleAppointment(token), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const body: ApiEnvelope<{
      movedTo?: string;
      meetingUrl?: string;
      alternatives?: { day: string; slots: Slot[] }[];
    }> = await response.json().catch(() => ({}));

    if (!response.ok || !body.data?.movedTo) {
      return {
        ok: false,
        message: body.message ?? "No pudimos mover tu cita. Sigue en pie a la hora de siempre.",
        alternatives: body.data?.alternatives?.[0]?.slots,
      };
    }

    return {
      ok: true,
      movedTo: body.data.movedTo,
      meetingUrl: body.data.meetingUrl ?? "",
    };
  } catch {
    return { ok: false, message: "No pudimos conectar con el servidor." };
  }
}

/** The shape both actions share: POST, read the envelope, never throw. */
async function postAction(
  url: string,
  payload: unknown,
  options: { fallback: string; alreadyDoneKey?: string },
): Promise<AppointmentActionResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });

    const body: ApiEnvelope<Record<string, unknown>> = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message: body.message ?? options.fallback,
        fieldErrors: body.details,
      };
    }

    // `alreadyCancelled` is a success: someone clicked twice or opened the link
    // on two devices. The UI says "ya estaba cancelada" instead of celebrating.
    const alreadyDone = options.alreadyDoneKey
      ? body.data?.[options.alreadyDoneKey] === true
      : false;

    return { ok: true, alreadyDone };
  } catch {
    return { ok: false, message: "No pudimos conectar con el servidor." };
  }
}
