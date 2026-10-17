import type { FieldErrors } from "react-hook-form";

// Reads a (possibly nested) error message for a field by name. The form is flat,
// so a top-level lookup is enough, but this stays defensive about shape.
export function getErrorMessage(
  errors: FieldErrors,
  name: string,
): string | undefined {
  const entry = errors[name as keyof FieldErrors];
  const message = entry && (entry as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}
