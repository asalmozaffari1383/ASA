import type { ReactNode } from "react";

type FormFieldProps = {
  /** id of the control this label points at. */
  htmlFor?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

// Shared chrome for a single field: label (+ required asterisk), the control,
// an optional hint, and an error line that reserves no space until it appears.
export function FormField({
  htmlFor,
  label,
  required,
  hint,
  error,
  children,
  className = "",
}: FormFieldProps) {
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="font-display text-sm font-semibold text-ink"
      >
        {label}
        {required ? (
          <span className="mr-1 text-accent-dark" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children}

      {hint ? (
        <p id={hintId} className="text-xs leading-6 text-slate-400">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-rose-600"
        >
          <span aria-hidden="true">●</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Tailwind classes shared by text-like controls, so inputs and textareas match.
// Square-cut, hairline-bordered plates — inputs read as machined slots.
export const controlClasses =
  "w-full rounded-none border bg-white px-4 py-3.5 text-base text-ink outline-none transition placeholder:text-steel focus:ring-2 focus:ring-accent/20";

export function controlBorder(hasError?: boolean): string {
  return hasError
    ? "border-rose-300 focus:border-rose-400"
    : "border-steel/40 focus:border-accent";
}
