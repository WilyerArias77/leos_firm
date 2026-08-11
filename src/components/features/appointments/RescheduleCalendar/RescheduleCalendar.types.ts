export type RescheduleCalendarProps = {
  /** HMAC-signed token from the confirmation email (ADR-016). */
  token: string;
  /** Where the appointment is now. Shown for reference and rejected if picked. */
  currentStartUtc: string;
  /**
   * The zone the appointment was booked in, read from the Calendar event.
   *
   * Not the browser's zone: someone who books from Bogotá and opens the link
   * while travelling should still see the hours they agreed to, in the zone
   * they agreed them in.
   */
  clientTimezone: string;
  /**
   * Sets the slot length of the grid from the catalog.
   *
   * ⚠️ The server sizes the move from the event's OWN duration, not from the
   * catalog, so an appointment sold at 60 minutes keeps 60 even though sessions
   * are 30 today. If the two ever disagree the grid may offer an hour the
   * server then refuses — which it answers with a `409` and that day redrawn,
   * so the failure is visible and recoverable rather than silent.
   */
  serviceSlug: string;
  /** Called once the appointment really moved. The page reloads its own data. */
  onMoved: (movedTo: string) => void;
  onCancel: () => void;
};
