import type { StepInfo } from "../../services/types";

// Vertical on mobile, horizontal on desktop — mirrors the request lifecycle.
export function TrackingStepper({ steps, current }: { steps: StepInfo[]; current: number }) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.key} className="flex flex-1 gap-3 sm:flex-col sm:items-center sm:text-center">
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-none font-display text-sm font-bold transition ${
                  done
                    ? "bg-ink text-white"
                    : active
                      ? "bg-white text-ink ring-2 ring-accent"
                      : "bg-white text-steel ring-2 ring-steel/30"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              {index < steps.length - 1 ? (
                <span
                  className={`mx-1 my-1 w-0.5 grow sm:my-0 sm:h-0.5 sm:w-full ${
                    done ? "bg-ink" : "bg-steel/30"
                  }`}
                />
              ) : null}
            </div>
            <span
              className={`pb-6 pt-1.5 text-sm sm:pb-0 ${
                active ? "font-bold text-ink" : "text-steel"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
