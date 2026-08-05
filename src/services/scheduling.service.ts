import { requestFromN8n } from "@/lib/n8n/client";
import { normalizeBusyBlocks } from "@/services/availability.service";
import type { BusyBlock, RawCalendarEvent } from "@/types/scheduling.types";

/**
 * The server side of scheduling: everything that has to go through n8n.
 *
 * Split from `availability.service.ts` on purpose — that one is pure
 * arithmetic and must stay testable and runnable anywhere. This one reaches
 * the network and therefore can only run on the server (it transitively
 * imports the `server-only` n8n client).
 *
 * Next.js holds no Google credentials (ADR-010): it asks n8n for Claudia's
 * calendar and decides everything else itself.
 */

/**
 * Claudia's busy blocks in a range, or `null` when n8n could not answer.
 *
 * The distinction matters more than it looks: `[]` means "the calendar is
 * open", `null` means "we do not know". Turning the second into the first
 * would show a wide-open agenda built on no information and sell hours that
 * are already taken. The caller turns `null` into a `502` and a phone number.
 */
export async function fetchBusyBlocks(range: {
  timeMin: string;
  timeMax: string;
}): Promise<BusyBlock[] | null> {
  const response = await requestFromN8n<unknown>("availability", range);
  if (response === null) return null;

  const events = unwrapEvents(response);
  if (!events) {
    console.error("[agenda] n8n devolvió una forma que no reconocemos — revisar el contrato");
    return null;
  }

  return normalizeBusyBlocks(events);
}

/**
 * Digs the event list out of whatever n8n sent.
 *
 * The contract accepts a bare array or `{ busy: [...] }`, because the shape
 * depends on how the workflow ends up wired and a mismatch here is invisible:
 * it looks like an empty calendar, not like an error
 * (`docs/features/scheduling.md` § Contrato exacto).
 */
function unwrapEvents(response: unknown): RawCalendarEvent[] | null {
  if (Array.isArray(response)) return response as RawCalendarEvent[];

  if (response && typeof response === "object") {
    const { busy, events, data } = response as Record<string, unknown>;

    for (const candidate of [busy, events, data]) {
      if (Array.isArray(candidate)) return candidate as RawCalendarEvent[];
    }
  }

  return null;
}

export type SlotHoldRequest = {
  leadId: string;
  fullName: string;
  email: string;
  phone: string;
  serviceName: string;
  serviceSlug: string;
  startUtc: string;
  endUtc: string;
  clientTimezone: string;
};

/**
 * Holds the slot by creating the tentative Calendar event (ADR-011).
 *
 * Returns its id, or `null` if n8n did not confirm one. **No id means no
 * booking**, even if the event was in fact created: we would be telling
 * someone they have an appointment we cannot point at, and the cleanup
 * workflow removes the orphan within `SLOT_HOLD_MINUTES` anyway.
 *
 * Keys are English `snake_case`, like the CRM payload. The workflow reads them
 * as `{{ $json.body.full_name }}` — the `{{ nombre }}` in the design sketch was
 * pseudocode and would leave the event title empty.
 */
export async function holdSlot(request: SlotHoldRequest): Promise<string | null> {
  const response = await requestFromN8n<Record<string, unknown>>("booking", {
    lead_id: request.leadId,
    full_name: request.fullName,
    email: request.email,
    phone: request.phone,
    service_name: request.serviceName,
    service_slug: request.serviceSlug,
    start_utc: request.startUtc,
    end_utc: request.endUtc,
    client_timezone: request.clientTimezone,
  });

  if (!response) return null;

  // `eventId` is what the contract asks for; `id` is what the Google Calendar
  // node returns when nobody renames it. Both are accepted so a forgotten Set
  // node does not cost an afternoon.
  const eventId = response.eventId ?? response.id;

  if (typeof eventId !== "string" || eventId.length === 0) {
    console.error("[agenda] n8n no devolvió eventId — la reserva no se da por hecha");
    return null;
  }

  return eventId;
}
