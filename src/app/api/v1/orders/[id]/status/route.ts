import { NextResponse } from "next/server";
import { ORDER_STATUS_RATE_LIMIT } from "@/constants/business";
import { checkRateLimit, getClientIp } from "@/lib/utils/rateLimit";
import { readOrderStatus } from "@/services/payment.service";
import type { PaymentStatus } from "@/types/payment.types";

/**
 * GET /api/v1/orders/[id]/status — public, the id is an opaque Square order id.
 * Documented in `docs/API_DOCS.md` · feature: `features/payments.md`.
 *
 * Short poll for the "processing" screen. It answers ONE of three words and
 * nothing else: no amounts, no card brands, no internal identifiers. Knowing an
 * order id must not become a way to read what somebody paid.
 *
 * **It does not confirm the appointment and cannot be used to.** The webhook
 * does that, out of band (ADR-002). `paid` here means Square says the money
 * cleared — the screen tells the visitor the confirmation arrives by email,
 * which is where the Meet link goes and where they will look for it.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request, props: RouteContext<"/api/v1/orders/[id]/status">) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(
    `order-status:${ip}`,
    ORDER_STATUS_RATE_LIMIT.maxRequests,
    ORDER_STATUS_RATE_LIMIT.windowMs,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Demasiadas consultas. Espera un momento." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // Next 16: route params are async.
  const { id } = await props.params;

  const status = await readOrderStatus(id);

  // Our failure reads as `pending`, never as `failed`: the money may well have
  // gone through, and telling someone their payment failed when we simply could
  // not ask is the worst answer available.
  const data: { status: PaymentStatus } = { status: status ?? "pending" };

  return NextResponse.json({ data }, { status: 200, headers: NO_STORE });
}
