import { cn } from "@/lib/utils/cn";
import type { BadgeProps, BadgeVariant } from "./Badge.types";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  price: "bg-navy-900 text-platinum",
  quote: "border border-border bg-surface-muted text-ink-muted",
  neutral: "bg-surface-muted text-ink-muted",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
