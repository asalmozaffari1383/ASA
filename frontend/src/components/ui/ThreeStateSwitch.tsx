import type { ThreeState } from "../../types";

interface Props {
  label: string;
  value: ThreeState;
  onChange: (next: ThreeState) => void;
  disabled?: boolean;
}

const OPTIONS: { label: string; value: ThreeState }[] = [
  { label: "بله", value: true },
  { label: "خیر", value: false },
  { label: "نامشخص", value: null },
];

/** Yes / No / Unknown segmented control (maps to BooleanField(null=True)). */
export function ThreeStateSwitch({ label, value, onChange, disabled }: Props) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-300">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={`px-4 py-1.5 text-sm transition disabled:opacity-60 ${
                active
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
