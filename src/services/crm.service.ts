import { ROOT_QUESTION_ID } from "@/constants/content/diagnostic";
import { PRICING_COPY } from "@/constants/content/services";
import { formatPrice } from "@/lib/utils/formatCurrency";
import { postToN8n } from "@/lib/n8n/client";
import { describeSteps, hasUsEntity } from "@/services/diagnostic.service";
import { getServiceBySlug } from "@/services/service.service";
import type { LeadPayload } from "@/lib/validation/lead.schema";
import { serviceStatusForStage } from "@/types/crm.types";
import type {
  CrmAppointmentRow,
  CrmDelivery,
  CrmPaymentRow,
  CrmRow,
  CrmStage,
} from "@/types/crm.types";
import type { DiagnosticStep } from "@/types/diagnostic.types";

/**
 * The CRM — a Google Sheet Claudia opens directly (ADR-010).
 *
 * This module turns what the site knows into the flat row that sheet expects,
 * and hands it to n8n. It is the only place that knows the column names, so a
 * change to the sheet is a change to `CRM_COLUMNS` and nothing else.
 *
 * It does NOT know how to reach Google — that is `src/lib/n8n/client.ts`
 * (Mandamiento II).
 */

/**
 * Header row of the sheet, in order.
 *
 * ⚠️ This array IS the contract with the spreadsheet. The first row of the
 * `Leads` tab must read exactly like this, and the n8n workflow maps by these
 * names. Renaming a column here without renaming it in the sheet drops the
 * value silently — Google Sheets does not complain about unknown keys.
 */
export const CRM_COLUMNS: readonly (keyof CrmRow)[] = [
  "lead_id",
  "stage",
  "service_status",
  "updated_at",
  "full_name",
  "email",
  "phone",
  "country",
  "p1_situacion",
  "p2_objetivo",
  "p3_urgencia",
  "has_us_entity",
  "recommended_service",
  "recommended_service_slug",
  "price_usd",
  "pricing_model",
  "viewed_service_slug",
  "source_path",
  "consent_at",
  "consent_ip",
];

/** Shown in the sheet when a branch skipped a question. Reads better than "". */
const NOT_ASKED = "—";

/**
 * The visitor's answer to one question, in the words they read.
 *
 * Looks the question up by id rather than by position: the two `objetivo-*`
 * branches sit at different depths depending on the first answer, and the
 * `empresa-extranjera` / `atrasado` paths skip that question altogether. A
 * positional read would put "es urgente" under "¿qué necesitas resolver?".
 */
function answerTo(
  steps: readonly DiagnosticStep[],
  matches: (questionId: string) => boolean,
): string {
  const step = steps.find((item) => matches(item.questionId));
  if (!step) return NOT_ASKED;

  return describeSteps([step])[0]?.answer ?? NOT_ASKED;
}

function describeUsEntity(steps: readonly DiagnosticStep[]): string {
  const value = hasUsEntity(steps);

  if (value === null) return NOT_ASKED;
  return value ? "Sí" : "No";
}

/**
 * Builds the row for a lead that just finished the diagnosis.
 *
 * Every value is a string: a spreadsheet cell has no other type, and letting
 * n8n coerce would turn a phone number into scientific notation.
 */
export async function buildLeadRow(lead: LeadPayload, ip: string): Promise<CrmRow> {
  const service = await getServiceBySlug(lead.recommendedServiceSlug);
  const now = new Date().toISOString();

  return {
    lead_id: lead.leadId,
    stage: "formulario" satisfies CrmStage,
    service_status: serviceStatusForStage("formulario") ?? "Pendiente de Atención",
    updated_at: now,

    full_name: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    country: lead.country,

    p1_situacion: answerTo(lead.steps, (id) => id === ROOT_QUESTION_ID),
    p2_objetivo: answerTo(lead.steps, (id) => id.startsWith("objetivo")),
    p3_urgencia: answerTo(lead.steps, (id) => id === "urgencia"),
    has_us_entity: describeUsEntity(lead.steps),

    // Read from the catalog on the server, never from the request: the price
    // the client claims is not the price we record (ADR-006).
    recommended_service: service?.name ?? lead.recommendedServiceSlug,
    recommended_service_slug: lead.recommendedServiceSlug,
    price_usd: service ? formatPrice(service.priceCents) : NOT_ASKED,
    pricing_model: service
      ? (PRICING_COPY[service.pricingModel].label ?? "Precio cerrado")
      : NOT_ASKED,

    viewed_service_slug: lead.viewedServiceSlug ?? NOT_ASKED,
    source_path: lead.sourcePath,

    consent_at: now,
    consent_ip: ip,
  };
}

/**
 * Writes the lead to the CRM.
 *
 * Returns `"failed"` instead of throwing: the visitor already gave us their
 * data and must not see an error because our spreadsheet integration is down.
 * The caller reports the status and the UI offers the phone number.
 */
export async function syncLeadToCrm(lead: LeadPayload, ip: string): Promise<CrmDelivery> {
  const row = await buildLeadRow(lead, ip);
  const accepted = await postToN8n("crm", row);

  return accepted ? "delivered" : "failed";
}

/**
 * Advances the row to `agenda`: the visitor picked a time and the slot is held,
 * payment still pending (`docs/features/crm-sheets.md`).
 *
 * Writes only its own columns, so the diagnosis answers survive untouched. The
 * meeting link is deliberately absent — there is no Meet until Square confirms
 * the payment, and writing an empty one would look like a lost value.
 *
 * Same failure contract as the lead: returns `"failed"` instead of throwing.
 * The slot IS held at this point, so a CRM outage must not undo a real
 * booking — the visitor keeps their appointment and we log the missing row.
 */
export async function syncAppointmentToCrm(appointment: {
  leadId: string;
  fullName: string;
  email: string;
  phone: string;
  startUtc: string;
  clientTimezone: string;
  policyAcceptedIp: string;
}): Promise<CrmDelivery> {
  const now = new Date().toISOString();

  const row: CrmAppointmentRow = {
    lead_id: appointment.leadId,
    stage: "agenda" satisfies CrmStage,
    service_status: serviceStatusForStage("agenda") ?? "Pendiente de Atención",
    updated_at: now,

    full_name: appointment.fullName,
    email: appointment.email,
    phone: appointment.phone,

    appointment_at: appointment.startUtc,
    appointment_timezone: appointment.clientTimezone,

    // Stamped here, never accepted from the browser: evidence the client can
    // write is not evidence. Mirrors `consent_at` / `consent_ip` above.
    policy_accepted_at: now,
    policy_accepted_ip: appointment.policyAcceptedIp,
  };

  const accepted = await postToN8n("crm", row);

  return accepted ? "delivered" : "failed";
}

/**
 * Advances the row to `pagado`: Square confirmed the money and the appointment
 * is real (`docs/features/payments.md`).
 *
 * Called only from the Square webhook, never from the browser (ADR-002). It
 * carries no contact fields on purpose — by now the row exists in `agenda`, and
 * a payment cannot be the first thing we learn about a person (ADR-008).
 *
 * `meeting_url` belongs to this stage and not to `agenda`: the Meet link is
 * created by WF3 after the payment clears, so there was nothing to write
 * before. An empty string is sent when WF3 reported no link — the sheet shows a
 * blank cell and the `Pagos` tab carries the reason.
 */
export async function syncPaymentToCrm(payment: {
  leadId: string;
  paymentId: string;
  amountUsd: string;
  paidAt: string;
  meetingUrl?: string;
}): Promise<CrmDelivery> {
  const row: CrmPaymentRow = {
    lead_id: payment.leadId,
    stage: "pagado" satisfies CrmStage,
    // `Atendido`: this row is written by the same WF3 run that sends the
    // confirmation email, which is the client's trigger for that status.
    service_status: serviceStatusForStage("pagado") ?? "Atendido",
    updated_at: new Date().toISOString(),

    payment_id: payment.paymentId,
    amount_usd: payment.amountUsd,
    paid_at: payment.paidAt,
    meeting_url: payment.meetingUrl ?? "",
  };

  const accepted = await postToN8n("crm", row);

  return accepted ? "delivered" : "failed";
}
