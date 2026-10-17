import { useFormContext } from "react-hook-form";
import { FormField } from "./FormField";
import { getErrorMessage } from "./fieldError";

export type RadioOption = {
  value: string;
  label: string;
  description?: string;
};

type RadioGroupProps = {
  name: string;
  label: string;
  options: RadioOption[];
  required?: boolean;
  hint?: string;
  /** "cards" = roomy two-up choices; "pills" = compact inline (e.g. بلی/خیر). */
  variant?: "cards" | "pills";
  className?: string;
};

export function RadioGroup({
  name,
  label,
  options,
  required,
  hint,
  variant = "cards",
  className,
}: RadioGroupProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();
  const error = getErrorMessage(errors, name);
  const selected = watch(name);

  const layout =
    variant === "pills"
      ? "flex flex-wrap gap-2"
      : "grid gap-3 sm:grid-cols-2";

  return (
    <FormField
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <div className={layout} role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const isActive = selected === option.value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`group relative flex cursor-pointer items-start gap-3 rounded-none border px-4 py-3 transition ${
                variant === "pills" ? "items-center py-2.5" : ""
              } ${
                isActive
                  ? "border-ink bg-accent-soft/60"
                  : "border-steel/30 bg-white hover:border-ink/50"
              }`}
            >
              <input
                id={id}
                type="radio"
                value={option.value}
                className="sr-only"
                {...register(name)}
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-none border-2 transition ${
                  variant === "pills" ? "mt-0" : ""
                } ${
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-steel/50 bg-white"
                }`}
              >
                {isActive ? <span className="h-2 w-2 bg-accent" /> : null}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-ink">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-0.5 text-xs leading-6 text-slate-400">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </FormField>
  );
}
