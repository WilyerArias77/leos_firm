export type AppointmentTimeProps = {
  /** UTC instant the consultation starts. */
  startUtc: string;
  /** UTC instant it ends. Used for the "9:00 – 10:00" range. */
  endUtc: string;
  /**
   * The zone the visitor was in WHEN THEY BOOKED, read off the Calendar event.
   * It is the server-rendered value and the fallback when the browser cannot be
   * asked — never the final word.
   */
  bookedTimezone: string;
};
