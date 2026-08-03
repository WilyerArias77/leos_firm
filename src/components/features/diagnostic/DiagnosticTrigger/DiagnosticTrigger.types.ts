import type { ButtonSize, ButtonVariant } from "@/components/ui/Button";
import type { Service } from "@/types/content.types";

export type DiagnosticTriggerProps = {
  /** Full catalog, passed down from a Server Component. */
  services: readonly Service[];
  /** Service being viewed, when the trigger sits on a detail page. */
  contextService?: Service | null;
  /** Open the popup by itself after a while. `false` = button only. */
  autoOpen?: boolean;
  /** Text of the inline button. Omit it to render only the automatic popup. */
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};
