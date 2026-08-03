import type { ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  /**
   * `false` removes every implicit way out: no Esc, no backdrop click, no close
   * button. The content must then provide an explicit exit of its own.
   * Used by the diagnosis popup, by request of the client.
   */
  dismissible?: boolean;
  /** Called when the visitor dismisses a dismissible modal with Esc. */
  onDismiss?: () => void;
  /** Id of the element that titles the dialog — required for `aria-labelledby`. */
  labelledBy: string;
  className?: string;
  children: ReactNode;
};
