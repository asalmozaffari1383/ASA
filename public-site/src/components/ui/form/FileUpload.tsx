import { useId, useRef, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { FormField } from "./FormField";

type FileUploadProps = {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  accept?: string;
  className?: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}

// File field controlled through react-hook-form so its value lives in the same
// form state as the rest of the wizard (preserved across steps, validated by zod).
export function FileUpload({
  name,
  label,
  required,
  hint,
  accept = ".pdf,.jpg,.jpeg,.png,.webp",
  className,
}: FileUploadProps) {
  const { control } = useFormContext();
  const {
    field: { value, onChange, onBlur },
    fieldState: { error },
  } = useController({ name, control });

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const descriptionId = useId();
  const file = value instanceof File && value.size > 0 ? (value as File) : null;

  function handleFiles(files: FileList | null) {
    const next = files?.[0];
    if (next) onChange(next);
  }

  function clear() {
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <FormField
      label={label}
      required={required}
      hint={hint}
      error={error?.message}
      className={className}
    >
      <input
        ref={inputRef}
        id={name}
        type="file"
        accept={accept}
        className="sr-only"
        aria-describedby={descriptionId}
        onChange={(event) => handleFiles(event.target.files)}
        onBlur={onBlur}
      />

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-none border border-ink bg-accent-soft/50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="clip-notch-sm grid h-10 w-10 shrink-0 place-items-center bg-ink text-accent-soft">
              ✓
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
              <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-sm px-3 py-1.5 text-xs font-semibold text-accent-dark transition hover:bg-white"
            >
              تغییر
            </button>
            <button
              type="button"
              onClick={clear}
              aria-label="حذف فایل"
              className="rounded-sm px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-white"
            >
              حذف
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          aria-invalid={error ? true : undefined}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed px-4 py-7 text-center transition ${
            isDragging
              ? "border-accent bg-accent-soft/60"
              : error
                ? "border-rose-300 bg-rose-50/40 hover:border-rose-400"
                : "border-steel/40 bg-white hover:border-ink/60 hover:bg-mist/60"
          }`}
        >
          <span className="grid h-11 w-11 place-items-center bg-ink text-xl text-white">
            ↑
          </span>
          <span className="text-sm font-semibold text-ink">
            فایل را بکشید و رها کنید یا کلیک کنید
          </span>
          <span id={descriptionId} className="text-xs text-slate-400">
            PDF، JPG، PNG یا WebP — حداکثر ۵ مگابایت
          </span>
        </button>
      )}
    </FormField>
  );
}
