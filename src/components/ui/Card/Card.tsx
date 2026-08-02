import { cn } from "@/lib/utils/cn";
import type { CardProps } from "./Card.types";

export function Card({ children, className, interactive = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface shadow-card",
        interactive && "transition-shadow hover:shadow-elevated",
        className,
      )}
    >
      {children}
    </div>
  );
}
