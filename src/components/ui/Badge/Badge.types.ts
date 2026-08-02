import type { ReactNode } from "react";

/**
 * `price` and `quote` are catalog labels. `neutral` is for metadata.
 * Note there is no "danger" variant here on purpose: badges in this design
 * never carry error semantics.
 */
export type BadgeVariant = "price" | "quote" | "neutral";

export type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};
