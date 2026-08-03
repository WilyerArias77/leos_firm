import type { ComponentPropsWithoutRef } from "react";

export type InputProps = {
  /** Required: the label is tied to the field with `htmlFor` (never a placeholder). */
  id: string;
  label: string;
  /** Validation message. Its presence turns the field into its error state. */
  error?: string;
  hint?: string;
} & Omit<ComponentPropsWithoutRef<"input">, "id">;
