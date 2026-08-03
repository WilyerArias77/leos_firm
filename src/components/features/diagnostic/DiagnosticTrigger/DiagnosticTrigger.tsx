"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DiagnosticDialog } from "@/components/features/diagnostic/DiagnosticDialog";
import { useDiagnosticPrompt } from "@/hooks/useDiagnosticPrompt";
import type { DiagnosticTriggerProps } from "./DiagnosticTrigger.types";

/**
 * Mounts the diagnosis popup and decides when it opens.
 *
 * Split from the dialog so it can be dropped anywhere without touching the
 * flow itself — including the home page, which is the next place it is meant
 * to appear (`docs/features/lead-diagnostic.md`):
 *
 * ```tsx
 * <DiagnosticTrigger services={services} label="Hacer mi diagnóstico gratuito" />
 * ```
 */
export function DiagnosticTrigger({
  services,
  contextService = null,
  autoOpen = false,
  label,
  variant = "primary",
  size = "md",
  className,
}: DiagnosticTriggerProps) {
  const pathname = usePathname();
  const { isOpen, open, close, decline, complete } = useDiagnosticPrompt({ autoOpen });

  return (
    <>
      {label ? (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          onClick={open}
        >
          {label}
        </Button>
      ) : null}

      <DiagnosticDialog
        open={isOpen}
        services={services}
        contextService={contextService}
        sourcePath={pathname}
        onDecline={decline}
        onComplete={complete}
        onClose={close}
      />
    </>
  );
}
