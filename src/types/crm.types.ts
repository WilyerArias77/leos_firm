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
 * keyed by `leadId` — Claudia reads one line per person, not three.
 *
 * `formulario` — finished the diagnosis. The contact exists, nothing is owed.
 * `agenda`     — picked a day and time; the slot is held, payment pending.
 * `pagado`     — Square confirmed the payment and the appointment is real.
 *
 * The order matters: a stage never moves backwards, so a late webhook cannot
 * downgrade a paid row.
 */
export type CrmStage = "formulario" | "agenda" | "pagado";

export const CRM_STAGE_ORDER: Record<CrmStage, number> = {
  formulario: 1,
  agenda: 2,
  pagado: 3,
};

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
