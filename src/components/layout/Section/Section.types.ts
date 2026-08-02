import type { ReactNode } from "react";

export type SectionTone = "surface" | "muted" | "navy";

export type SectionProps = {
  children: ReactNode;
  className?: string;
  tone?: SectionTone;
  id?: string;
};

export type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: SectionTone;
  /** Centers the block. Off by default — left-aligned reads more institutional. */
  centered?: boolean;
};
