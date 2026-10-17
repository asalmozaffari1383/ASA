import type { ReactNode } from "react";

interface Props {
  content: ReactNode;
  children: ReactNode;
}

/** Lightweight hover/focus tooltip (group-based, no JS state). */
export function Tooltip({ content, children }: Props) {
  if (!content) return <>{children}</>;
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full start-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 translate-x-1/2 rounded-lg bg-slate-800 p-3 text-xs leading-6 text-white shadow-lg group-hover:block group-focus-within:block"
      >
        {content}
      </span>
    </span>
  );
}
