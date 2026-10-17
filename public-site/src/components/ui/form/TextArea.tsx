import { useFormContext } from "react-hook-form";
import { FormField, controlBorder, controlClasses } from "./FormField";
import { getErrorMessage } from "./fieldError";

type TextAreaProps = {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
};

export function TextArea({
  name,
  label,
  required,
  hint,
  placeholder,
  rows = 4,
  className,
}: TextAreaProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = getErrorMessage(errors, name);

  return (
    <FormField
      htmlFor={name}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`${controlClasses} resize-none leading-7 ${controlBorder(Boolean(error))}`}
        {...register(name)}
      />
    </FormField>
  );
}
