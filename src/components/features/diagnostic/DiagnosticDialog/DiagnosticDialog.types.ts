import type { Service } from "@/types/content.types";
import type { CrmDelivery } from "@/types/crm.types";
import type { DiagnosticContact, DiagnosticStep } from "@/types/diagnostic.types";

export type DiagnosticDialogProps = {
  open: boolean;
  /** Full catalog: the recommendation is resolved in the browser, no fetch. */
  services: readonly Service[];
  /** Service being viewed when the popup opened, if any. */
  contextService: Service | null;
  /** Path the diagnosis is running on — travels with the lead. */
  sourcePath: string;
  /** "No quiero mi diagnóstico gratuito, solo estoy viendo". */
  onDecline: () => void;
  /** Lead successfully sent — do not ask this visitor again. */
  onComplete: () => void;
  /** Close from the result screen. */
  onClose: () => void;
  /** Close from any step — the X of the modal and the button of the form. */
  onDismiss: () => void;
};

export type DiagnosticIntroProps = {
  titleId: string;
  service: Service | null;
  onAccept: () => void;
  onDecline: () => void;
};

export type DiagnosticThreadProps = {
  steps: readonly DiagnosticStep[];
};

export type DiagnosticQuestionStepProps = {
  titleId: string;
  questionId: string;
  steps: readonly DiagnosticStep[];
  progress: number;
  onAnswer: (optionId: string) => void;
  onBack: () => void;
};

export type DiagnosticContactStepProps = {
  titleId: string;
  steps: readonly DiagnosticStep[];
  progress: number;
  isSubmitting: boolean;
  errorMessage: string | null;
  fieldErrors: Record<string, string>;
  onBack: () => void;
  onSubmit: (contact: DiagnosticContact) => void;
  onDismiss: () => void;
};

export type DiagnosticResultProps = {
  titleId: string;
  /** The service the answers point to. No branch left to choose (ADR-009). */
  service: Service;
  /** Whether the lead reached the CRM — decides if the fallback notice shows. */
  delivery: CrmDelivery;
  onClose: () => void;
};
