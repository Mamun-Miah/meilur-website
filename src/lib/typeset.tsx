import { Fragment, type ReactNode } from "react";

/**
 * Display typesetting. Gloock's "f" ends in a hook that reaches over a tall
 * neighbour, so "fl", "fi", "fb" and friends touch at headline sizes even with
 * ligatures off. The "f" is wrapped so the stylesheet can open the pair
 * (`.f-gap`, heritage theme only) by a fraction of the type size.
 */
export function typeset(text: string): ReactNode {
  const parts = text.split(/(f(?=[bfhiklt]))/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part === "f" && i % 2 === 1 ? (
      <span key={i} className="f-gap">
        f
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
