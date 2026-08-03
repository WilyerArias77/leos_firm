import { NextResponse } from "next/server";
import { LEAD_RATE_LIMIT } from "@/constants/business";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { leadSchema, normalizeLead, toFieldErrors } from "@/lib/validation/lead.schema";
import { describeSteps, hasUsEntity } from "@/services/diagnostic.service";
import type { LeadPayload } from "@/lib/validation/lead.schema";

/**
 * POST /api/v1/leads — public, rate limited.
 * Documented in `docs/API_DOCS.md` · feature: `docs/features/lead-diagnostic.md`.
 *
 * Registers a contact captured by the free diagnosis, BEFORE any payment
 * (ADR-008). This is the endpoint the whole popup exists for.
 *
 * ⚠️ FASE 3 (current): validates, rate limits and acknowledges — it does NOT
 * persist to Supabase nor email Claudia yet, because neither the project nor
 * the Google service account exist. Delivery is FASE 6 (`docs/00-roadmap.md`)
 * and the response says so with `delivery: "pending"`. The site must not go
 * live before that phase closes, or leads are lost.
 */

/** Never log PII in production (`docs/03-security.md` §PII). */
function logLead(lead: LeadPayload, ip: string): void {
  if (process.env.NODE_ENV === "production") {
    console.info("[lead] recibido", {
      outcome: lead.outcome,
      service: lead.recommendedServiceSlug,
      viewedService: lead.viewedServiceSlug,
      country: lead.country,
      hasUsEntity: hasUsEntity(lead.steps),
    });
    console.warn(
      "[lead] SIN ENTREGA: falta Supabase + Gmail (FASE 6). El contacto no quedó guardado.",
    );
    return;
  }

  // Development only: the full record, so the flow can actually be tested.
  console.info("[lead] recibido (dev)", {
    ...lead,
    consentIp: ip,
    answers: describeSteps(lead.steps),
  });
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
  logLead(lead, ip);

  return NextResponse.json(
    {
      data: {
        received: true,
        outcome: lead.outcome,
        recommendedServiceSlug: lead.recommendedServiceSlug,
        /** `pending` until FASE 6 wires Supabase + Gmail. */
        delivery: "pending",
      },
      message: "Datos recibidos",
    },
    { status: 201 },
  );
}
