import type { StoredContact } from "@/services/lead.service";

export type BookingFormValues = {
  fullName: string;
  email: string;
  phone: string;
  policyAccepted: boolean;
};

export type BookingFormProps = {
  /** Chosen slot, in UTC. */
  startUtc: string;
  clientTimezone: string;
  /** Captured by the diagnosis; `null` for a visitor who arrived cold. */
  contact: StoredContact | null;
  submitting: boolean;
  /** Whole-form message (network, upstream, slot taken). */
  error: string | null;
  fieldErrors?: Record<string, string>;
  onSubmit: (values: BookingFormValues) => void;
};
