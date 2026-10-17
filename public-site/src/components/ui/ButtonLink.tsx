import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "onDark";
  /** When set, renders a react-router Link (client-side route) instead of <a>. */
  to?: string;
};

// Solid, planted, sharp-cornered plates — the ink block is the brand gesture.
// Hover flashes to the electric accent instead of lifting: machinery switches
// state, it doesn't float.
const variants = {
  primary: "bg-ink text-white hover:bg-accent hover:text-ink",
  secondary:
    "border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-white",
  onDark: "bg-white text-ink hover:bg-accent hover:text-ink",
};

const baseClasses =
  "group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl px-7 py-3.5 text-center font-display text-sm font-bold tracking-tight transition-colors duration-200 sm:px-8 sm:py-4";

export function ButtonLink({
  children,
  variant = "primary",
  className = "",
  to,
  ...props
}: ButtonLinkProps) {
  const classes = `${baseClasses} ${variants[variant]} ${className}`;
  const content = (
    <>
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="text-sm transition-transform duration-200 group-hover:-translate-x-1.5"
      >
        ←
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <a className={classes} {...props}>
      {content}
    </a>
  );
}
