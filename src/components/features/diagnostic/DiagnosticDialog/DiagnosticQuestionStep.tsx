import { ArrowLeft, ChevronRight } from "lucide-react";
import { DIAGNOSTIC_COPY } from "@/constants/content/diagnostic";
import { getQuestion } from "@/services/diagnostic.service";
import { DiagnosticProgress } from "./DiagnosticProgress";
import { DiagnosticThread } from "./DiagnosticThread";
import type { DiagnosticQuestionStepProps } from "./DiagnosticDialog.types";

/** One question of the tree, with everything answered so far above it. */
export function DiagnosticQuestionStep({
  titleId,
  questionId,
  steps,
  progress,
  onAnswer,
  onBack,
}: DiagnosticQuestionStepProps) {
  const question = getQuestion(questionId);

  if (!question) return null;

  return (
    <div className="p-6 sm:p-8">
      <DiagnosticProgress value={progress} />

      {steps.length > 0 ? (
        <div className="mt-6">
          <DiagnosticThread steps={steps} />
        </div>
      ) : null}

      <h2 id={titleId} className="mt-6 font-serif text-xl text-navy-900">
        {question.prompt}
      </h2>

      {question.helper ? (
        <p className="mt-2 text-sm text-ink-muted">{question.helper}</p>
      ) : null}

      <ul className="mt-5 space-y-2.5">
        {question.options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onAnswer(option.id)}
              className="flex w-full items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3.5 text-left text-sm text-ink transition-colors hover:border-accent hover:bg-surface-muted"
            >
              <span>{option.label}</span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-ink-muted"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>

      {steps.length > 0 ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-5 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {DIAGNOSTIC_COPY.backLabel}
        </button>
      ) : null}
    </div>
  );
}
