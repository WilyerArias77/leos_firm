import { cn } from "@/lib/utils/cn";
import type { InputProps } from "./Input.types";

/**
 * Text field with a real label, hint and error message wired through
 * `aria-describedby`. A placeholder is never a substitute for a label: it
 * disappears as soon as the visitor types.
 */
export function Input({ id, label, error, hint, className, ...props }: InputProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "mt-2 block w-full rounded-card border bg-surface px-3.5 py-2.5 text-sm text-ink",
          "placeholder:text-ink-muted focus:border-accent focus:outline-none",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      />

      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
