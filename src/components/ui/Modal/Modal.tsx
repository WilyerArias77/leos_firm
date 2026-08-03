"use client";

import { useEffect, useRef } from "react";
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
          className={cn(
            "w-full max-w-lg rounded-card border border-border bg-surface text-ink shadow-elevated",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
}
