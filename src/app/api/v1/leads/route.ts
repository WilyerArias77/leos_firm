import { NextResponse } from "next/server";
import { LEAD_RATE_LIMIT } from "@/constants/business";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { leadSchema, normalizeLead, toFieldErrors } from "@/lib/validation/lead.schema";
import { syncLeadToCrm } from "@/services/crm.service";
import { hasUsEntity } from "@/services/diagnostic.service";
import type { LeadPayload } from "@/lib/validation/lead.schema";
import type { CrmDelivery } from "@/types/crm.types";

/**
 * POST /api/v1/leads — public, rate limited.
 * Documented in `docs/API_DOCS.md` · features: `lead-diagnostic.md`, `crm-sheets.md`.
 *
 * Registers a contact captured by the free diagnosis, BEFORE any payment
 * (ADR-008). This is the endpoint the whole popup exists for.
 *
 * Since ADR-010 it delivers for real: the lead is written to the Google Sheet
 * CRM through n8n. A failed write does NOT fail the request — the visitor gets
 * their diagnosis and the phone number, and we log the loss.
 */

/** Never log PII in production (`docs/03-security.md` §PII). */
function logLead(lead: LeadPayload, delivery: CrmDelivery): void {
  const summary = {
    leadId: lead.leadId,
    service: lead.recommendedServiceSlug,
    viewedService: lead.viewedServiceSlug,
    country: lead.country,
    hasUsEntity: hasUsEntity(lead.steps),
    delivery,
  };

  if (delivery === "failed") {
    // Loud on purpose: a lead that never reached the sheet is a lost client.
    // The identifying data stays out of the log — recovery is the phone call
    // the visitor is invited to make, plus the n8n execution history.
    console.error("[lead] NO LLEGÓ AL CRM", summary);
    return;
  }

  console.info("[lead] registrado", summary);
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(
    `leads:${ip}`,
    LEAD_RATE_LIMIT.maxRequests,
    LEAD_RATE_LIMIT.windowMs,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Recibimos varias solicitudes desde este dispositivo. Inténtalo más tarde.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "No pudimos leer los datos enviados." },
      { status: 400 },
    );
  }

  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Revisa los datos del formulario.",
        details: toFieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const lead = normalizeLead(parsed.data);
  const delivery = await syncLeadToCrm(lead, ip);

  logLead(lead, delivery);

  return NextResponse.json(
    {
      data: {
        received: true,
        leadId: lead.leadId,
        recommendedServiceSlug: lead.recommendedServiceSlug,
        /** `failed` means the sheet did not take it — the UI offers the phone. */
        delivery,
      },
      message: "Datos recibidos",
    },
    { status: 201 },
  );
}
