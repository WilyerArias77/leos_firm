import type { CalendarDay } from "@/lib/utils/timezone";
import type { DayAvailability } from "@/types/scheduling.types";

export type AvailabilityCalendarProps = {
  /** Any day of the month being shown. */
  month: CalendarDay;
  /** Every day of the month, including the full ones (rendered as "sin cupo"). */
  days: DayAvailability[];
  selectedDay: CalendarDay | null;
  loading: boolean;
  /** Used to know which square is "today" from the visitor's point of view. */
  clientTimezone: string;
  onSelectDay: (day: CalendarDay) => void;
  onChangeMonth: (month: CalendarDay) => void;
};
