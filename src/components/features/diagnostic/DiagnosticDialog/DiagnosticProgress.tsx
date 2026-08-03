/**
 * Progress of the questionnaire.
 *
 * Shown as a bar and not as "step 2 of 4" on purpose: the branches have
 * different lengths, so a total that shrinks halfway through would look broken
 * (see `getProgress` in `diagnostic.service.ts`).
 */
export function DiagnosticProgress({ value }: { value: number }) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Avance del diagnóstico"
      className="h-1 w-full overflow-hidden rounded-full bg-border"
    >
      <div
        className="h-full rounded-full bg-accent transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
