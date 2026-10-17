type CornerBracketsProps = {
  /** Border color utility, e.g. "border-accent" or "border-white/40". */
  className?: string;
  /** Bracket arm length. */
  size?: "sm" | "md";
};

// Four L-shaped registration marks at the corners of a positioned container —
// a technical/engineered framing motif. Purely decorative.
export function CornerBrackets({
  className = "border-accent",
  size = "md",
}: CornerBracketsProps) {
  const arm = size === "sm" ? "h-3 w-3" : "h-5 w-5";
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className={`absolute right-0 top-0 border-r-2 border-t-2 ${arm} ${className}`} />
      <span className={`absolute left-0 top-0 border-l-2 border-t-2 ${arm} ${className}`} />
      <span className={`absolute bottom-0 right-0 border-b-2 border-r-2 ${arm} ${className}`} />
      <span className={`absolute bottom-0 left-0 border-b-2 border-l-2 ${arm} ${className}`} />
    </span>
  );
}
