import { useFormContext } from "react-hook-form";
import { FormField, controlBorder, controlClasses } from "./FormField";
import { getErrorMessage } from "./fieldError";

type TextInputProps = {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  type?: "text" | "tel" | "email" | "date" | "number";
  inputMode?: "text" | "numeric" | "tel" | "decimal";
  dir?: "rtl" | "ltr";
  className?: string;
};

export function TextInput({
  name,
  label,
  required,
  hint,
  placeholder,
  type = "text",
  inputMode,
  dir,
  className,
}: TextInputProps) {
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
      <input
        id={name}
        type={type}
        inputMode={inputMode}
        dir={dir}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`${controlClasses} ${controlBorder(Boolean(error))}`}
        {...register(name)}
      />
    </FormField>
  );
}
