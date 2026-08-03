import { Check } from "lucide-react";
import { getOption } from "@/services/diagnostic.service";
import type { DiagnosticThreadProps } from "./DiagnosticDialog.types";

/**
 * What has been answered so far, with the firm's reply to each answer.
 *
 * This is what turns a form into a conversation: the visitor sees that every
 * answer produced a reaction, so the diagnosis feels like it is being built
 * live rather than submitted blindly.
 */
export function DiagnosticThread({ steps }: DiagnosticThreadProps) {
  if (steps.length === 0) return null;

  return (
    <ol className="space-y-3">
      {steps.map((step) => {
        const option = getOption(step.questionId, step.optionId);
        if (!option) return null;

        return (
          <li key={`${step.questionId}:${step.optionId}`} className="flex gap-3">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-success"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-ink">{option.label}</p>
              <p className="mt-1 border-l-2 border-gold pl-3 text-xs leading-relaxed text-ink-muted">
                {option.insight}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
