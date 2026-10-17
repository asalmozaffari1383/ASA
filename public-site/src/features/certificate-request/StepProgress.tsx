import { steps } from "./steps";

type StepProgressProps = {
  /** Zero-based index of the active step. */
  current: number;
};

export function StepProgress({ current }: StepProgressProps) {
  const percent = (current / (steps.length - 1)) * 100;

  return (
    <div className="mb-10">
      <ol className="relative flex items-start justify-between">
        {/* Track + accent fill connecting the markers (RTL: fill from the right). */}
        <span
          aria-hidden="true"
          className="absolute right-[1.25rem] left-[1.25rem] top-5 h-0.5 bg-steel/30"
        />
        <span
          aria-hidden="true"
          className="absolute right-[1.25rem] top-5 h-0.5 bg-accent transition-all duration-500"
          style={{ width: `calc((100% - 2.5rem) * ${percent / 100})` }}
        />

        {steps.map((step, index) => {
          const isComplete = index < current;
          const isActive = index === current;
          return (
            <li
              key={step.id}
              className="relative z-10 flex flex-1 flex-col items-center gap-2 text-center"
            >
              <span
                aria-current={isActive ? "step" : undefined}
                className={`grid h-10 w-10 place-items-center rounded-none border-2 font-display text-sm font-bold transition duration-300 ${
                  isComplete
                    ? "border-ink bg-ink text-white"
                    : isActive
                      ? "border-accent bg-white text-ink"
                      : "border-steel/40 bg-white text-steel"
                }`}
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <span
                className={`max-w-[7rem] text-xs font-semibold leading-5 transition sm:text-sm ${
                  isActive || isComplete ? "text-ink" : "text-steel"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
