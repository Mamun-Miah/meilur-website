import type { CSSProperties } from "react";

/** The client's mark, painted in the current text colour through a CSS mask. */
export function Logo({ src, label, className = "" }: { src: string; label: string; className?: string }) {
  return (
    <span
      className={`logo ${className}`}
      role="img"
      aria-label={label}
      style={{ "--logo-src": `url("${src}")` } as CSSProperties}
    />
  );
}
