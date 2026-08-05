"use client";

import { useCallback, useEffect, useState } from "react";
import { endOfMonth, startOfMonth } from "@/lib/utils/timezone";
import { fetchAvailability } from "@/services/appointment.service";
import type { CalendarDay } from "@/lib/utils/timezone";
import type { AvailabilityResult, DayAvailability } from "@/types/scheduling.types";

/**
 * Free slots for the month on screen (`docs/features/scheduling.md`).
 *
 * All the network lives in `appointment.service.ts`; this only owns the state
 * around it (Mandamiento II). The calendar component receives days and renders
 * them — it does not know an API exists.
 */

export type UseAvailability = {
  days: DayAvailability[];
  nextAvailableFrom: CalendarDay | null;
  loading: boolean;
  /** Friendly Spanish message, already suitable for display. */
  error: string | null;
  /** Re-asks for the current month — used by the "reintentar" button. */
  refresh: () => void;
};

/** What was asked for, and what came back for it. */
type FetchState = {
  key: string;
  result: AvailabilityResult | null;
  error: string | null;
};

export function useAvailability(params: {
  /** Any day of the month to show. */
  month: CalendarDay;
  timeZone: string;
  serviceSlug?: string;
}): UseAvailability {
  const { month, timeZone, serviceSlug } = params;

  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<FetchState>({ key: "", result: null, error: null });

  const requestKey = `${month}|${timeZone}|${serviceSlug ?? ""}|${reloadToken}`;

  /**
   * `loading` is DERIVED, not stored: it is simply "what I have does not match
   * what I asked for". Setting it inside the effect would trigger a second
   * render on every month change for a value that was already knowable.
   */
  const loading = state.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    void fetchAvailability(
      { from: startOfMonth(month), to: endOfMonth(month), timeZone, serviceSlug },
      controller.signal,
    ).then((response) => {
      // Aborted means the visitor moved on to another month. Landing this
      // answer now would paint August over September.
      if (controller.signal.aborted) return;

      setState({
        key: requestKey,
        result: response.ok ? response.result : null,
        // An empty message is a cancellation, not something to show.
        error: response.ok ? null : response.message || null,
      });
    });

    return () => controller.abort();
  }, [requestKey, month, timeZone, serviceSlug]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    days: state.result?.days ?? [],
    nextAvailableFrom: state.result?.nextAvailableFrom ?? null,
    loading,
    error: state.error,
    refresh,
  };
}
