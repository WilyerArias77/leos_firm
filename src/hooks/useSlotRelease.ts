"use client";

import { useCallback, useEffect, useRef } from "react";
import { API_ROUTES } from "@/constants/routes";

/**
 * Frees an unpaid hold the moment the visitor walks away (client request,
 * 2026-08-07 — `docs/features/scheduling.md` § Liberar el hueco).
 *
 * **This is an optimisation, never a guarantee.** The slot already expires on
 * its own after `SLOT_HOLD_MINUTES`; this only makes the calendar free up
 * sooner. Every failure path here is therefore harmless, which is why nothing
 * reports an error and nothing blocks on it.
 *
 * **A declined card must not call this** — the client's process spec asks for a
 * retry, and a decline is an ordinary event. `active` must go false only when
 * the payment SUCCEEDS, and `release()` is for the visitor saying no.
 */

/**
 * `pagehide` and not `beforeunload`.
 *
 * `beforeunload` is unreliable on mobile: Safari and Chrome on Android often
 * freeze a backgrounded tab and kill it without ever firing it. `pagehide`
 * fires in both cases and is the event the bfcache contract is built around.
 * `visibilitychange` is deliberately NOT used — switching tabs to copy a card
 * number from a banking app is the most normal thing a payer does, and
 * releasing the slot there would be the opposite of what we want.
 */
const LEAVE_EVENT = "pagehide";

function beacon(eventId: string): void {
  const body = JSON.stringify({ eventId });

  // `sendBeacon` is the only thing the browser guarantees to deliver while the
  // page is being torn down — a normal `fetch` gets cancelled with it. The Blob
  // carries the JSON content type so the route's `request.json()` still works.
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(API_ROUTES.releaseSlot, new Blob([body], { type: "application/json" }));
    return;
  }

  // Older browsers: `keepalive` is the fallback with the same intent. If it
  // does not make it either, the cleaner still has the slot.
  void fetch(API_ROUTES.releaseSlot, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function useSlotRelease({ eventId, active }: { eventId: string | null; active: boolean }) {
  /** Guards against releasing twice — the button then `pagehide`, typically. */
  const releasedRef = useRef(false);

  const release = useCallback(() => {
    if (!eventId || releasedRef.current) return;

    releasedRef.current = true;
    beacon(eventId);
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !active) return;

    const onLeave = () => {
      if (releasedRef.current) return;

      releasedRef.current = true;
      beacon(eventId);
    };

    window.addEventListener(LEAVE_EVENT, onLeave);
    return () => window.removeEventListener(LEAVE_EVENT, onLeave);
  }, [eventId, active]);

  return { release };
}
