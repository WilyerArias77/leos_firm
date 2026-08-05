import { Globe } from "lucide-react";
import { BUSINESS_TIMEZONE, COMPANY } from "@/constants/business";
import { timeZoneAbbreviation } from "@/lib/utils/timezone";
import type { TimezoneNoticeProps } from "./TimezoneNotice.types";

/**
 * Tells the visitor which clock they are looking at.
 *
 * Not decoration: the site guesses the zone from the browser, and someone
 * travelling — or with a misconfigured machine — would otherwise book at a
 * time they never intended. Saying it out loud turns a silent wrong assumption
 * into something they can catch (`docs/features/scheduling.md`).
 */
export function TimezoneNotice({ clientTimezone, className }: TimezoneNoticeProps) {
  const now = new Date();
  const visitorZone = timeZoneAbbreviation(now, clientTimezone);
  const firmZone = timeZoneAbbreviation(now, BUSINESS_TIMEZONE);
  const sameZone = clientTimezone === BUSINESS_TIMEZONE;

  return (
    <p
      className={`flex items-start gap-2 rounded-card border border-border bg-surface-muted p-3 text-xs leading-relaxed text-ink-muted ${className ?? ""}`}
    >
      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
      <span>
        {sameZone ? (
          <>
            Los horarios se muestran en la hora de San Antonio ({firmZone}).
          </>
        ) : (
          <>
            Ves los horarios en tu hora local (<strong className="text-ink">{visitorZone}</strong>
            ). {COMPANY.ceo} atiende desde San Antonio, Texas ({firmZone}) — al confirmar te
            mostramos las dos horas.
          </>
        )}
      </span>
    </p>
  );
}
