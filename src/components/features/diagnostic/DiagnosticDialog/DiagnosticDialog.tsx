"use client";

import { useId, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DIAGNOSTIC_COPY } from "@/constants/content/diagnostic";
import {
  getNextQuestionId,
  getProgress,
  getRootQuestion,
  resolveRecommendation,
} from "@/services/diagnostic.service";
import { submitLead } from "@/services/lead.service";
import type { Service } from "@/types/content.types";
import type { CrmDelivery } from "@/types/crm.types";
import type { DiagnosticContact, DiagnosticStep } from "@/types/diagnostic.types";
import { DiagnosticContactStep } from "./DiagnosticContactStep";
import { DiagnosticIntro } from "./DiagnosticIntro";
import { DiagnosticQuestionStep } from "./DiagnosticQuestionStep";
import { DiagnosticResult } from "./DiagnosticResult";
import type { DiagnosticDialogProps } from "./DiagnosticDialog.types";

type Stage = "intro" | "questions" | "contact" | "result";

/**
 * The free-diagnosis popup (`docs/features/lead-diagnostic.md`).
 *
 * Holds only screen state: which step is showing and what has been answered.
 * Every decision — which question comes next, which service the answers point
 * to, which branch it falls into — lives in `diagnostic.service.ts`, and the
 * network call lives in `lead.service.ts` (Mandamiento II).
 */
export function DiagnosticDialog({
  open,
  services,
  contextService,
  sourcePath,
  onDecline,
  onComplete,
  onClose,
  onDismiss,
}: DiagnosticDialogProps) {
  const titleId = useId();

  const [stage, setStage] = useState<Stage>("intro");
  const [steps, setSteps] = useState<DiagnosticStep[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Service | null>(null);
  const [delivery, setDelivery] = useState<CrmDelivery>("delivered");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const progress = getProgress(steps, currentQuestionId);

  function handleAccept() {
    setCurrentQuestionId(getRootQuestion().id);
    setStage("questions");
  }

  function handleAnswer(optionId: string) {
    if (!currentQuestionId) return;

    setSteps([...steps, { questionId: currentQuestionId, optionId }]);

    const nextQuestionId = getNextQuestionId(currentQuestionId, optionId);
    setCurrentQuestionId(nextQuestionId);

    if (!nextQuestionId) setStage("contact");
  }

  function handleBack() {
    const previous = steps.at(-1);

    if (!previous) {
      setStage("intro");
      return;
    }

    setSteps(steps.slice(0, -1));
    setCurrentQuestionId(previous.questionId);
    setStage("questions");
  }

  async function handleSubmit(contact: DiagnosticContact) {
    const resolved = resolveRecommendation(steps, services);

    if (!resolved) {
      // Only reachable if the question tree lost its service slugs.
      setErrorMessage(DIAGNOSTIC_COPY.errorMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    const result = await submitLead({
      ...contact,
      steps,
      recommendedServiceSlug: resolved.slug,
      viewedServiceSlug: contextService?.slug ?? null,
      sourcePath,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    setDelivery(result.delivery);
    setRecommendation(resolved);
    setStage("result");
    onComplete();
  }

  return (
    <Modal
      open={open}
      onDismiss={onDismiss}
      closeLabel={DIAGNOSTIC_COPY.dismissLabel}
      labelledBy={titleId}
    >
      {stage === "intro" ? (
        <DiagnosticIntro
          titleId={titleId}
          service={contextService}
          onAccept={handleAccept}
          onDecline={onDecline}
        />
      ) : null}

      {stage === "questions" && currentQuestionId ? (
        <DiagnosticQuestionStep
          titleId={titleId}
          questionId={currentQuestionId}
          steps={steps}
          progress={progress}
          onAnswer={handleAnswer}
          onBack={handleBack}
        />
      ) : null}

      {stage === "contact" ? (
        <DiagnosticContactStep
          titleId={titleId}
          steps={steps}
          progress={progress}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onBack={handleBack}
          onSubmit={handleSubmit}
          onDismiss={onDismiss}
        />
      ) : null}

      {stage === "result" && recommendation ? (
        <DiagnosticResult
          titleId={titleId}
          service={recommendation}
          delivery={delivery}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}
