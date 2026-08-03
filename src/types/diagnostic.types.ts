import type { Service } from "@/types/content.types";

/**
 * Types for the free-diagnosis flow (`docs/features/lead-diagnostic.md`).
 *
 * The questionnaire is a directed graph: every option either points to the next
 * question or ends the questionnaire, and may attach the catalog slug it leads
 * to. Keeping it as data (instead of `if` statements) means Claudia can reword
 * or reorder the questions in `src/constants/content/diagnostic.ts` without
 * anyone touching logic.
 */

export type DiagnosticQuestionId = string;
export type DiagnosticOptionId = string;

export type DiagnosticOption = {
  id: DiagnosticOptionId;
  /** What the visitor clicks. */
  label: string;
  /**
   * Immediate reply shown right after choosing — this is what makes the flow
   * feel like live advice instead of a form. Operational wording only: never a
   * tax or legal claim (Mandamiento I).
   */
  insight: string;
  /**
   * Catalog slug this answer points to. When a path crosses several options
   * carrying a slug, the last one wins (the later question is more specific).
   */
  serviceSlug?: string;
  /** `null` ends the questionnaire and moves on to the contact step. */
  nextQuestionId: DiagnosticQuestionId | null;
};

export type DiagnosticQuestion = {
  id: DiagnosticQuestionId;
  prompt: string;
  helper?: string;
  options: readonly DiagnosticOption[];
};

/** One answered question, in the order it was answered. */
export type DiagnosticStep = {
  questionId: DiagnosticQuestionId;
  optionId: DiagnosticOptionId;
};

/**
 * What the visitor should do next.
 *
 * - `checkout` — the service has an automatic price, so it can be paid online.
 * - `contact`  — variable price: Claudia gets an email with the case.
 *
 * Derived from the catalog, never from a hardcoded list of slugs.
 */
export type DiagnosticOutcome = "checkout" | "contact";

export type DiagnosticRecommendation = {
  service: Service;
  outcome: DiagnosticOutcome;
};

/** Contact details captured at the end of the questionnaire. */
export type DiagnosticContact = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  consent: boolean;
};

/** Where the visitor was when the diagnosis started. */
export type DiagnosticSource = {
  /** Service being viewed when the popup opened, if any. */
  viewedServiceSlug: string | null;
  /** Path of the page the diagnosis was completed on. */
  sourcePath: string;
};
