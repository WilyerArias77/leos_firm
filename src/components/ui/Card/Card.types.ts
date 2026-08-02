import type { ReactNode } from "react";

export type CardProps = {
  children: ReactNode;
  className?: string;
  /** Adds a subtle lift on hover. Use only when the whole card is clickable. */
  interactive?: boolean;
};
