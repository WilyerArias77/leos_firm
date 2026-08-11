import type { RefundWindow } from "@/types/appointment.types";

export type AppointmentActionsProps = {
  /** The HMAC-signed token from the URL. Travels in the path of every call. */
  token: string;
  /**
   * Which side of the 24 h line the appointment is on RIGHT NOW, decided by the
   * server (`context.md` §8). Used to word the confirmation and to decide which
   * rescheduling path to offer — never as a guarantee: every endpoint recomputes
   * it on its own clock, and its verdict is the one that reaches Claudia.
   */
  refundWindow: RefundWindow;
  /** Where the appointment is now, so the reschedule screen can say so. */
  startUtc: string;
  /** The zone it was booked in. The new hours are shown in that same zone. */
  clientTimezone: string;
  /** Sizes the slot grid from the catalog (ADR-019). May be empty. */
  serviceSlug: string;
};
