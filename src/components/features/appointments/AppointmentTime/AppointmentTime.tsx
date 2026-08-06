"use client";

import { useSyncExternalStore } from "react";
import {
  detectClientTimeZone,
  formatDayInZone,
  formatTimeInZone,
  timeZoneAbbreviation,
} from "@/lib/utils/timezone";
import type { AppointmentTimeProps } from "./AppointmentTime.types";

/** Never fires: the snapshot is a constant, we only need server vs. client. */
const subscribeToNothing = () => () => {};

/**
 * The appointment's time in the VISITOR's zone
 * (`docs/features/appointment-management.md` § Los dos husos).
 *
 * The server cannot know where the link is being opened from. It has two
 * candidates and neither is the answer: `America/Chicago` is the firm's zone,
 * and the zone stored on the event is the one the visitor had when they booked
 * — a good starting value, but the email can be opened from another country.
 *
 * So the server renders the stored zone, which keeps the page readable with
 * JavaScript disabled, and the browser renders its own. `useSyncExternalStore`
 * is what makes that safe: it hands the first (hydrating) render the server's
 * answer and the next one the browser's, instead of producing two different
 * markups for the same render and tripping a hydration mismatch. Same idiom as
 * `BookingFlow`, for the same reason.
 *
 * The firm's own hour is rendered by the page, on the server, right next to
 * this. Neither hour is ever shown alone.
 */
export function AppointmentTime({ startUtc, endUtc, bookedTimezone }: AppointmentTimeProps) {
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const timeZone = hydrated ? detectClientTimeZone() : bookedTimezone;

  const start = new Date(startUtc);
  const end = new Date(endUtc);

  return (
    <>
      <p className="font-serif text-lg text-navy-900">{formatDayInZone(start, timeZone)}</p>

      <p className="mt-1 text-sm text-ink">
        {formatTimeInZone(start, timeZone)} – {formatTimeInZone(end, timeZone)}{" "}
        <span className="text-ink-muted">({timeZoneAbbreviation(start, timeZone)})</span>
      </p>

      <p className="mt-1 text-xs text-ink-muted">{timeZone}</p>
    </>
  );
}
