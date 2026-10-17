export type Scope = "pending" | "all";

/**
 * "در انتظار / همه" switch mirroring the finance dashboard toggle. ``pending`` keeps
 * each page's default queue; ``all`` asks the API for every record.
 */
export function ScopeToggle({
  value,
  onChange,
  pendingLabel = "در انتظار",
}: {
  value: Scope;
  onChange: (s: Scope) => void;
  pendingLabel?: string;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-300">
      {(["pending", "all"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`px-4 py-1.5 text-sm ${
            value === s ? "bg-brand-600 text-white" : "bg-white text-slate-600"
          }`}
        >
          {s === "pending" ? pendingLabel : "همه"}
        </button>
      ))}
    </div>
  );
}
