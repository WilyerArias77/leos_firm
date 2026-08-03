import {
  DIAGNOSTIC_QUESTIONS,
  OPTIONS_WITH_US_ENTITY,
  ROOT_QUESTION_ID,
} from "@/constants/content/diagnostic";
import type { Service } from "@/types/content.types";
import type {
  DiagnosticOption,
  DiagnosticOutcome,
  DiagnosticQuestion,
  DiagnosticQuestionId,
  DiagnosticRecommendation,
  DiagnosticStep,
} from "@/types/diagnostic.types";

/**
 * Business logic of the free diagnosis (`docs/features/lead-diagnostic.md`).
 *
 * Pure functions only: no React, no fetch, no side effects. Both the browser
 * (to drive the popup) and the server (to describe the lead in the email to
 * Claudia) run exactly this code, so client and server can never disagree on
 * what was recommended.
 */

const QUESTIONS_BY_ID = new Map<DiagnosticQuestionId, DiagnosticQuestion>(
  DIAGNOSTIC_QUESTIONS.map((question) => [question.id, question]),
);

export function getQuestion(id: DiagnosticQuestionId): DiagnosticQuestion | null {
  return QUESTIONS_BY_ID.get(id) ?? null;
}

export function getRootQuestion(): DiagnosticQuestion {
  const root = getQuestion(ROOT_QUESTION_ID);

  if (!root) {
    // Content error, not a runtime condition: fail loudly instead of rendering
    // an empty popup.
    throw new Error(
      `ROOT_QUESTION_ID "${ROOT_QUESTION_ID}" is missing from DIAGNOSTIC_QUESTIONS`,
    );
  }

  return root;
}

export function getOption(
  questionId: DiagnosticQuestionId,
  optionId: string,
): DiagnosticOption | null {
  const question = getQuestion(questionId);
  return question?.options.find((option) => option.id === optionId) ?? null;
}

/** The question that follows an answer, or `null` when the questionnaire ends. */
export function getNextQuestionId(
  questionId: DiagnosticQuestionId,
  optionId: string,
): DiagnosticQuestionId | null {
  return getOption(questionId, optionId)?.nextQuestionId ?? null;
}

/**
 * Slug the path points to. The last option carrying a slug wins: later
 * questions are more specific than earlier ones.
 */
export function resolveRecommendedSlug(steps: readonly DiagnosticStep[]): string | null {
  let slug: string | null = null;

  for (const step of steps) {
    const option = getOption(step.questionId, step.optionId);
    if (option?.serviceSlug) slug = option.serviceSlug;
  }

  return slug;
}

/**
 * Which branch the visitor falls into (ADR-008).
 *
 * A service with a price can be charged online; one without a price depends on
 * the case and goes to Claudia by email. This reads the catalog on purpose: the
 * day a quote-based service gets a fixed price, it moves to the checkout branch
 * with zero code changes.
 */
export function getOutcome(service: Service): DiagnosticOutcome {
  return service.priceCents === null ? "contact" : "checkout";
}

export function resolveRecommendation(
  steps: readonly DiagnosticStep[],
  services: readonly Service[],
): DiagnosticRecommendation | null {
  const slug = resolveRecommendedSlug(steps);
  if (!slug) return null;

  const service = services.find((item) => item.slug === slug);
  if (!service) return null;

  return { service, outcome: getOutcome(service) };
}

/**
 * Whether the visitor already has a US entity (`context.md` §7).
 * `null` when the first question has not been answered yet.
 */
export function hasUsEntity(steps: readonly DiagnosticStep[]): boolean | null {
  const first = steps.find((step) => step.questionId === ROOT_QUESTION_ID);
  if (!first) return null;

  return OPTIONS_WITH_US_ENTITY.includes(first.optionId);
}

/** Question + chosen answer, in plain text — for the CRM and for Claudia's email. */
export function describeSteps(
  steps: readonly DiagnosticStep[],
): { question: string; answer: string }[] {
  return steps.flatMap((step) => {
    const question = getQuestion(step.questionId);
    const option = getOption(step.questionId, step.optionId);

    if (!question || !option) return [];

    return [{ question: question.prompt, answer: option.label }];
  });
}

/**
 * Longest number of questions still ahead from `questionId`.
 * `visited` guards against a cycle introduced by a content edit.
 */
function maxRemainingQuestions(
  questionId: DiagnosticQuestionId | null,
  visited: ReadonlySet<DiagnosticQuestionId> = new Set(),
): number {
  if (!questionId || visited.has(questionId)) return 0;

  const question = getQuestion(questionId);
  if (!question) return 0;

  const nextVisited = new Set(visited).add(questionId);
  const depths = question.options.map(
    (option) => maxRemainingQuestions(option.nextQuestionId, nextVisited),
  );

  return 1 + Math.max(0, ...depths);
}

/**
 * Progress of the questionnaire, 0 to 1, counting the contact step as the last
 * one. Deliberately not shown as "step N of M": branches have different
 * lengths, and a total that shrinks mid-flow looks broken.
 */
export function getProgress(
  steps: readonly DiagnosticStep[],
  currentQuestionId: DiagnosticQuestionId | null,
): number {
  const answered = steps.length;
  const remaining = maxRemainingQuestions(currentQuestionId) + 1;

  return answered / (answered + remaining);
}
