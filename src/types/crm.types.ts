/**
 * CRM types — `docs/features/crm-sheets.md`.
 *
 * The CRM is a Google Sheet that Claudia opens directly (ADR-010). Next.js
 * never talks to Google: it POSTs a flat row to an n8n webhook and n8n does the
 * upsert. These types describe that contract, so a column rename is caught by
 * the compiler on our side and by the workflow's column mapping on n8n's.
 */

/**
 * How far down the funnel the contact got. Each stage overwrites the same row,
 * keyed by `leadId` — Claudia reads one line per person, not four.
 *
 * `formulario` — finished the diagnosis. The contact exists, nothing is owed.
 * `agenda`     — picked a day and time; the slot is held, payment pending.
 * `pagado`     — Square confirmed the payment and the appointment is real.
 * `cancelado`  — the client cancelled from their own link (FASE 9). TERMINAL.
 *
 * The order matters: a stage never moves backwards, so a late webhook cannot
 * downgrade a paid row.
 */
export type CrmStage = "formulario" | "agenda" | "pagado" | "cancelado";

/**
 * `cancelado` gets the HIGHEST number, and that alone is what makes it terminal
 * — no new rule was needed. The one that already existed does all the work: a
 * late `agenda` (2) cannot resurrect a cancelled appointment and a delayed
 * Square webhook (3) cannot either, because both are lower than 4.
 */
export const CRM_STAGE_ORDER: Record<CrmStage, number> = {
  formulario: 1,
  agenda: 2,
  pagado: 3,
  cancelado: 4,
};

/**
 * Whether a row in `from` may be written as `to`.
 *
 * ⚠️ **Defined here, not yet enforced by the workflow.** WF1 does an
 * `appendOrUpdate` keyed by `ID` without looking at the previous stage — a debt
 * `docs/features/crm-sheets.md` § Pendiente has carried since before FASE 9.
 * This function exists so the rule is written in exactly one place for the day
 * the workflow reads it, instead of being re-derived in a Code node.
 *
 * Equal stages are allowed: rewriting `pagado` over `pagado` is the idempotent
 * second delivery of one Square payment, and it writes the same values.
 */
export function canAdvanceStage(from: CrmStage, to: CrmStage): boolean {
  return CRM_STAGE_ORDER[to] >= CRM_STAGE_ORDER[from];
}

/**
 * Whether the row reached the sheet.
 *
 * `failed` is not an error the visitor caused, so it never blocks the flow — it
 * only switches the UI to the phone-number fallback.
 */
export type CrmDelivery = "delivered" | "failed";

/**
 * One row of the sheet, flat on purpose: Google Sheets has no nested values and
 * n8n maps these keys to columns by name.
 *
 * Column order in the sheet must match `CRM_COLUMNS` in
 * `src/services/crm.service.ts`. Adding a field here without adding the column
 * there — and in the sheet — silently drops the value.
 */
export type CrmRow = {
  lead_id: string;
  stage: CrmStage;
  updated_at: string;

  full_name: string;
  email: string;
  phone: string;
  country: string;

  /** Answers as the visitor read them, not as option ids. */
  p1_situacion: string;
  p2_objetivo: string;
  p3_urgencia: string;
  has_us_entity: string;

  recommended_service: string;
  recommended_service_slug: string;
  price_usd: string;
  pricing_model: string;

  viewed_service_slug: string;
  source_path: string;

  consent_at: string;
  consent_ip: string;
};

/**
 * What the `agenda` stage writes — and ONLY that.
 *
 * Each stage touches its own columns and leaves the rest alone, so booking
 * cannot erase the diagnosis answers and the browser does not have to remember
 * the full row (`docs/features/crm-sheets.md`).
 *
 * `policy_accepted_at` and `policy_accepted_ip` land in columns Z and AA, added
 * to the sheet on 2026-08-06 along with the mapping in WF1. Both are stamped by
 * the server (`crm.service.ts`), never by the browser: they are the evidence
 * that the cancellation policy was accepted (`context.md` § 8).
 */
export type CrmAppointmentRow = {
  lead_id: string;
  stage: CrmStage;
  updated_at: string;

  /**
   * Repeated from the `formulario` stage on purpose.
   *
   * A visitor who lands on `/agendar` without having done the diagnosis has no
   * row yet, and writing only the appointment columns would leave Claudia with
   * a booking under a bare UUID. For everyone else these overwrite themselves
   * with identical values, which costs nothing.
   */
  full_name: string;
  email: string;
  phone: string;

  /** UTC instant of the appointment. The sheet shows it as text. */
  appointment_at: string;
  /** The visitor's zone, so Claudia knows what time THEY think it is. */
  appointment_timezone: string;

  /** Evidence of the cancellation policy acceptance (`context.md` §8.9). */
  policy_accepted_at: string;
  policy_accepted_ip: string;
};

/**
 * What the `pagado` stage writes — and ONLY that.
 *
 * Written by the Square webhook, never by the browser (ADR-002). By the time
 * this runs the row already exists in `agenda`, so it carries no contact
 * fields: the payment cannot be the first thing we learn about a person.
 *
 * The columns exist in the sheet already; until FASE 6 nobody filled them.
 *
 * ⚠️ `meeting_url` belongs HERE, not in `CrmAppointmentRow`. The Meet link is
 * created by `Leos Firm - Confirmar cita` after the payment clears — there is
 * no link to write while the slot is only held (`docs/features/payments.md`).
 */
export type CrmPaymentRow = {
  lead_id: string;
  stage: CrmStage;
  updated_at: string;

  /** Square's payment id. Kept for support and for FASE 9 refunds. */
  payment_id: string;
  /** Plain decimal string, as every value in the sheet (`"150.00"`). */
  amount_usd: string;
  paid_at: string;
  meeting_url: string;
};
