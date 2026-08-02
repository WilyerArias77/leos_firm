import { cn } from "@/lib/utils/cn";
import type { ContainerProps } from "./Container.types";

/** Single source of truth for max width and horizontal padding. */
export function Container({ children, className, size = "default" }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 lg:px-8",
        size === "default" ? "max-w-6xl" : "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
