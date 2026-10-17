import { useRef } from "react";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
}

/** Custom multi-image attachment area with thumbnail previews + remove. */
export function MultiImageInput({ files, onChange, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    if (!list) return;
    onChange([...files, ...Array.from(list)]);
  };
  const remove = (i: number) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {files.map((file, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-lg ring-1 ring-slate-200">
            <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-500 hover:text-brand-600"
        >
          <span className="text-2xl leading-none">＋</span>
          <span className="text-xs">افزودن تصویر</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        hidden
        onChange={(e) => add(e.target.files)}
      />
    </div>
  );
}
