import type { ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  /**
   * `false` removes every implicit way out: no Esc, no backdrop click, no close
   * button. The content must then provide an explicit exit of its own.
   */
  dismissible?: boolean;
  /**
   * Called when the visitor closes the modal — with Esc or with the close
   * button. The button only renders when this handler is given.
   */
  onDismiss?: () => void;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** Id of the element that titles the dialog — required for `aria-labelledby`. */
  labelledBy: string;
  className?: string;
  children: ReactNode;
};
