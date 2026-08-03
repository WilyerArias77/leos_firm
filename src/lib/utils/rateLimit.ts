/**
 * Best-effort in-memory rate limiter for public endpoints
 * (`docs/03-security.md` — "rate limiting en endpoints públicos").
 *
 * Limitation, stated on purpose: the counter lives in the memory of a single
 * serverless instance, so it does not stop a distributed attack. It does stop
 * the realistic case — one script hammering the lead endpoint — with zero
 * dependencies and zero infrastructure. When Supabase exists (FASE 6) this
 * moves to a shared store; the signature will not change.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Drops expired buckets so the map cannot grow forever. */
function evictExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the caller may retry. `0` when allowed. */
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  evictExpired(now);

  const bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Client IP from the proxy headers Vercel sets.
 * Falls back to a constant so a missing header degrades into a shared bucket
 * instead of silently disabling the limit.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return headers.get("x-real-ip")?.trim() || "unknown";
}
