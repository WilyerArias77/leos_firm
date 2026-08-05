import type { CalendarDay } from "@/lib/utils/timezone";
import type { Slot } from "@/types/scheduling.types";

export type SlotPickerProps = {
  /** Chosen day, or `null` before the visitor picks one. */
  day: CalendarDay | null;
  slots: Slot[];
  /** `startUtc` of the chosen slot. */
  selectedSlot: string | null;
  clientTimezone: string;
  onSelectSlot: (startUtc: string) => void;
};
