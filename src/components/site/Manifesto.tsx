"use client";

import { useRef } from "react";
import { stage, useScrollProgress } from "./useScrollProgress";

type Props = { lines: string[]; proofs: string[]; body: string; surface: string };

/**
 * The company's own line, "Your event | Your success | Our expertise", lit one
 * phrase at a time while the section holds still. Each phrase is paired with
 * the strength from the business profile that backs it up.
 */
export function Manifesto({ lines, proofs, body, surface }: Props) {
  const pane = useRef<HTMLDivElement>(null);
  const ref = useScrollProgress<HTMLElement>((p) => {
    const el = pane.current;
    if (!el) return;
    const n = lines.length;
    lines.forEach((_, i) => {
      const a = (i / n) * 0.78;
      el.style.setProperty(`--l${i}`, stage(p, a, a + 0.78 / n).toFixed(4));
    });
    el.style.setProperty("--end", stage(p, 0.8, 0.95).toFixed(4));
  });

  return (
    <section ref={ref} id="about" className="manifesto" data-surface={surface} aria-labelledby="about-title">
      <div ref={pane} className="manifesto__pin">
        <div className="container manifesto__inner">
          <h2 id="about-title" className="visually-hidden">
            {lines.join(", ")}
          </h2>
          <ul className="manifesto__lines">
            {lines.map((line, i) => (
              <li key={line} className="manifesto__line" style={{ ["--l" as string]: `var(--l${i}, 1)` }}>
                <span className="manifesto__word">{line}</span>
                {proofs[i] ? <span className="manifesto__proof">{proofs[i]}</span> : null}
              </li>
            ))}
          </ul>
          <p className="manifesto__body">{body}</p>
        </div>
      </div>
    </section>
  );
}
