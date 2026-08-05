import type { Service } from "@/types/content.types";

export type BookingFlowProps = {
  /** Read from the catalog on the server (ADR-006) — never from the URL. */
  service: Service;
};
