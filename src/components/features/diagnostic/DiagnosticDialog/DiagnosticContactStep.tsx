"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DIAGNOSTIC_COPY } from "@/constants/content/diagnostic";
import { DiagnosticProgress } from "./DiagnosticProgress";
import { DiagnosticThread } from "./DiagnosticThread";
import type { DiagnosticContactStepProps } from "./DiagnosticDialog.types";

/**
 * Last step before the result: the contact details.
 *
 * This is the whole point of the popup (ADR-008) — the lead is captured here,
 * before any payment and before the visitor sees the recommendation.
 */
export function DiagnosticContactStep({
  titleId,
  steps,
  progress,
  isSubmitting,
  errorMessage,
  fieldErrors,
  onBack,
  onSubmit,
}: DiagnosticContactStepProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [consent, setConsent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ fullName, email, phone, country, consent });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8">
      <DiagnosticProgress value={progress} />

      <div className="mt-6">
        <DiagnosticThread steps={steps} />
      </div>

      <h2 id={titleId} className="mt-6 font-serif text-xl text-navy-900">
        {DIAGNOSTIC_COPY.contactTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {DIAGNOSTIC_COPY.contactHelper}
      </p>

      <div className="mt-5 space-y-4">
        <Input
          id="diagnostico-nombre"
          name="fullName"
          label="Nombre completo"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={fieldErrors.fullName}
          disabled={isSubmitting}
        />

        <Input
          id="diagnostico-email"
          name="email"
          type="email"
          label="Correo electrónico"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          disabled={isSubmitting}
        />

        <Input
          id="diagnostico-telefono"
          name="phone"
          type="tel"
          label="Número de contacto"
          hint="Incluye el código de tu país."
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={fieldErrors.phone}
          disabled={isSubmitting}
        />

        <Input
          id="diagnostico-pais"
          name="country"
          label="País de residencia"
          autoComplete="country-name"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          error={fieldErrors.country}
          disabled={isSubmitting}
        />

        <div>
          <label
            htmlFor="diagnostico-consentimiento"
            className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-ink-muted"
          >
            <input
              id="diagnostico-consentimiento"
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={isSubmitting}
              aria-invalid={fieldErrors.consent ? true : undefined}
              aria-describedby={fieldErrors.consent ? "diagnostico-consentimiento-error" : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span>{DIAGNOSTIC_COPY.consentLabel}</span>
          </label>

          {fieldErrors.consent ? (
            <p id="diagnostico-consentimiento-error" className="mt-1.5 text-xs text-danger">
              {fieldErrors.consent}
            </p>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-card border border-danger/30 bg-surface-muted p-3 text-xs leading-relaxed text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-6 w-full">
        {isSubmitting ? DIAGNOSTIC_COPY.submittingLabel : DIAGNOSTIC_COPY.submitLabel}
      </Button>

      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="mt-5 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink disabled:opacity-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {DIAGNOSTIC_COPY.backLabel}
      </button>
    </form>
  );
}
