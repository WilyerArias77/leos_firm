import { LEAD_STORAGE_KEY } from "@/constants/business";
import { API_ROUTES } from "@/constants/routes";
import { leadSchema, toFieldErrors } from "@/lib/validation/lead.schema";
import type { LeadPayload } from "@/lib/validation/lead.schema";
import type { CrmDelivery } from "@/types/crm.types";

/**
 * Sends a diagnosis lead to our own API.
 *
 * Lives here, not inside the popup, because components never talk to a data
 * source directly (Mandamiento II). The component only renders the result.
 */

/** Everything the popup knows. The `leadId` is minted here, not by the caller. */
export type LeadDraft = Omit<LeadPayload, "leadId">;

export type LeadSubmission =
  | { ok: true; leadId: string; delivery: CrmDelivery }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

type LeadResponse = {
  data?: { delivery?: CrmDelivery };
  message?: string;
  details?: Record<string, string>;
};

/**
 * Reads the id of the lead captured earlier in this visit, so scheduling and
 * payment update that same CRM row instead of opening a new one.
 * `null` when the visitor has not completed the diagnosis in this session.
 */
export function getStoredLeadId(): string | null {
  if (typeof window === "undefined") return null;

  return window.sessionStorage.getItem(LEAD_STORAGE_KEY);
}

export async function submitLead(draft: LeadDraft): Promise<LeadSubmission> {
  const leadId = crypto.randomUUID();

  // Same schema the server runs. Here it is UX (instant field errors); the
  // server revalidates and its verdict is the one that counts.
  const parsed = leadSchema.safeParse({ ...draft, leadId });

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

    const body: LeadResponse = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message: body.message ?? "No pudimos registrar tus datos.",
        fieldErrors: body.details,
      };
    }

    // The id is kept even when the CRM write failed: the next steps still need
    // to name this row, and a retry from the scheduling screen can complete it.
    window.sessionStorage.setItem(LEAD_STORAGE_KEY, leadId);

    return { ok: true, leadId, delivery: body.data?.delivery ?? "failed" };
  } catch {
    // Network failure: the caller offers the phone number as a way out.
    return { ok: false, message: "No pudimos conectar con el servidor." };
  }
}
