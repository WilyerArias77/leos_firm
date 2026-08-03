import { API_ROUTES } from "@/constants/routes";
import { leadSchema, toFieldErrors } from "@/lib/validation/lead.schema";
import type { LeadPayload } from "@/lib/validation/lead.schema";

/**
 * Sends a diagnosis lead to our own API.
 *
 * Lives here, not inside the popup, because components never talk to a data
 * source directly (Mandamiento II). The component only renders the result.
 */

export type LeadSubmission =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

type LeadErrorResponse = {
  message?: string;
  details?: Record<string, string>;
};

export async function submitLead(payload: LeadPayload): Promise<LeadSubmission> {
  // Same schema the server runs. Here it is UX (instant field errors); the
  // server revalidates and its verdict is the one that counts.
  const parsed = leadSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los datos del formulario.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const response = await fetch(API_ROUTES.leads, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (response.ok) return { ok: true };

    const body: LeadErrorResponse = await response.json().catch(() => ({}));

    return {
      ok: false,
      message: body.message ?? "No pudimos registrar tus datos.",
      fieldErrors: body.details,
    };
  } catch {
    // Network failure: the caller offers the phone number as a way out.
    return { ok: false, message: "No pudimos conectar con el servidor." };
  }
}
