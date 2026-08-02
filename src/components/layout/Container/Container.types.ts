import type { ReactNode } from "react";

export type ContainerProps = {
  children: ReactNode;
  className?: string;
  /** `narrow` for long-form reading (policies, FAQ). */
  size?: "default" | "narrow";
};
