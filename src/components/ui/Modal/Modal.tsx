"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ModalProps } from "./Modal.types";

/**
 * Modal built on the native `<dialog>` element.
 *
 * `showModal()` is used deliberately instead of a hand-rolled overlay: the
 * browser gives correct focus trapping, marks the rest of the page `inert` and
 * exposes the right role to screen readers — three things that are easy to get
 * wrong by hand.
 */
export function Modal({
  open,
  dismissible = true,
  onDismiss,
  closeLabel = "Cerrar",
  labelledBy,
  className,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // `showModal()` blocks interaction but not scrolling of the page behind.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        // Esc. Always prevented first: when the modal is not dismissible the
        // only way out is the explicit button its content renders.
        event.preventDefault();
        if (dismissible) onDismiss?.();
      }}
      className="fixed inset-0 h-full max-h-full w-full max-w-full overflow-y-auto bg-transparent p-0 backdrop:bg-navy-950/80"
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          // Initial focus lands on the panel, not on the close button: the
          // screen reader announces the dialog instead of "Cerrar", and no
          // focus ring flashes on open. Tab moves on to the content.
          tabIndex={-1}
          autoFocus
          className={cn(
            "relative w-full max-w-lg rounded-card border border-border bg-surface text-ink shadow-elevated outline-none",
            className,
          )}
        >
          {dismissible && onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={closeLabel}
              title={closeLabel}
              className="absolute top-4 right-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-card text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}

          {children}
        </div>
      </div>
    </dialog>
  );
}
