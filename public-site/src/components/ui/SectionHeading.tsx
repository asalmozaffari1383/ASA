type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  /** Left-aligned (editorial) instead of centered. Defaults to centered. */
  align?: "center" | "start";
  /** "dark" renders light text for use on carbon/graphite bands. */
  tone?: "light" | "dark";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "light",
}: SectionHeadingProps) {
  const isStart = align === "start";
  const onDark = tone === "dark";
  return (
    <div className={isStart ? "max-w-3xl" : "mx-auto max-w-3xl text-center"}>
      {/* Bare technical label: accent tick + tracked caption, no chip chrome. */}
      <span
        className={`inline-flex items-center gap-2.5 text-xs font-bold tracking-[0.22em] ${
          onDark ? "text-white/60" : "text-steel-dark"
        }`}
      >
        <span className="h-2 w-2 bg-accent" aria-hidden="true" />
        {eyebrow}
      </span>
      <h2
        className={`mt-4 font-display text-3xl font-bold leading-[1.6] tracking-tight sm:text-4xl ${
          onDark ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-5 max-w-2xl text-lg leading-8 ${
            onDark ? "text-white/65" : "text-steel-dark"
          } ${isStart ? "" : "mx-auto"}`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
