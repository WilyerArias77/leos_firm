import type { RefundWindow } from "@/types/appointment.types";

export type AppointmentActionsProps = {
  /** The HMAC-signed token from the URL. Travels in the path of both calls. */
  token: string;
  /**
   * Which side of the 24 h line the appointment is on RIGHT NOW, decided by the
   * server (`context.md` §8). Used to word the confirmation — never to decide
   * anything: the endpoint recomputes it on its own clock, and its verdict is
   * the one that reaches Claudia.
   */
  refundWindow: RefundWindow;
  /** The firm's phone, for when our side fails. */
  phone: string;
};
