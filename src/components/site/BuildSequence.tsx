"use client";

import { useRef, useState } from "react";
import { stage, useScrollProgress } from "./useScrollProgress";

type Step = { title: string; text: string };
type Props = { steps: Step[]; surface: string };

/* Where each act of the build begins and ends, as a share of the scroll. */
const ACTS: [number, number][] = [
  [0.0, 0.22], // understand: the plot is marked out
  [0.2, 0.46], // design: wireframe walls rise
  [0.44, 0.72], // produce: surfaces, graphics, counter, rigging
  [0.72, 0.94], // deliver: lights on
];

/**
 * The signature: a stand is built in front of the visitor as they scroll.
 * The plot is set out, the walls rise as a wireframe, the surfaces, graphic
 * and counter go in, the rigging flies in, and the lights come on. The four
 * acts are the company's own four steps, read from the admin settings.
 */
export function BuildSequence({ steps, surface }: Props) {
  const [active, setActive] = useState(steps.length - 1);
  const lastActive = useRef(active);
  const stageRef = useRef<HTMLDivElement>(null);

  const ref = useScrollProgress<HTMLElement>((p) => {
    const el = stageRef.current?.closest<HTMLElement>(".build");
    if (!el) return;
    ACTS.forEach(([a, b], i) => el.style.setProperty(`--s${i + 1}`, stage(p, a, b).toFixed(4)));
    el.style.setProperty("--p", p.toFixed(4));
    // Map the four acts onto however many steps the admin has written (2 to 6).
    const act = Math.max(0, ACTS.findLastIndex(([a]) => p >= a));
    const next = Math.min(steps.length - 1, Math.round((act * (steps.length - 1)) / (ACTS.length - 1)));
    if (next !== lastActive.current) {
      lastActive.current = next;
      setActive(next);
    }
  });

  return (
    <section ref={ref} className="build" data-surface={surface} aria-labelledby="build-title">
      <div className="build__pin">
        <div className="container build__layout">
          <div className="build__copy">
            <h2 id="build-title" className="build__title">
              How a project runs
            </h2>
            <ol className="build__steps">
              {steps.map((s, i) => (
                <li key={s.title} className="build__step" data-state={i < active ? "done" : i === active ? "active" : "next"}>
                  <span className="build__num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="build__name">{s.title}</span>
                  <span className="build__text">{s.text}</span>
                </li>
              ))}
            </ol>
            <div className="build__meter" aria-hidden="true">
              <span />
            </div>
          </div>

          <div ref={stageRef} className="build__stage" aria-hidden="true">
            <div className="build__glow" />
            <div className="build__scene">
              <div className="build__world">
                {/* Floor: the plot, set out, then carpeted */}
                <div className="b-floor">
                  <div className="b-floor__finish" />
                  <svg className="b-floor__lines" viewBox="0 0 420 420" preserveAspectRatio="none">
                    <rect x="2" y="2" width="416" height="416" pathLength={1} />
                    <path pathLength={1} d="M0 140 H420 M0 280 H420 M140 0 V420 M280 0 V420" className="b-floor__grid" />
                  </svg>
                  <div className="b-pool b-pool--1" />
                  <div className="b-pool b-pool--2" />
                  <div className="b-pool b-pool--3" />
                </div>
                <div className="b-dim b-dim--x" />
                <div className="b-dim b-dim--y" />

                {/* Raised platform: its front and right edges, with a trim line */}
                <div className="b-plinth b-plinth--front" />
                <div className="b-plinth b-plinth--side" />

                {/* Soft contact shadows under the furniture */}
                <div className="b-shadow b-shadow--counter" />
                <div className="b-shadow b-shadow--totem" />

                {/* Wall thickness, capped along the top */}
                <div className="b-cap b-cap--back" />
                <div className="b-cap b-cap--side" />

                {/* Back wall with the client's graphic and fascia */}
                <div className="b-wall b-wall--back">
                  <div className="b-wall__fill" />
                  <div className="b-graphic">
                    <span className="b-graphic__mark" />
                    <span className="b-graphic__bar b-graphic__bar--1" />
                    <span className="b-graphic__bar b-graphic__bar--2" />
                    <span className="b-graphic__bar b-graphic__bar--3" />
                  </div>
                  <div className="b-screen" />
                  <div className="b-fascia">Your brand</div>
                </div>
                {/* Side wall */}
                <div className="b-wall b-wall--side">
                  <div className="b-wall__fill" />
                  <div className="b-stripe" />
                </div>

                {/* Reception counter with a brand stripe */}
                <div className="b-counter b-counter--top" />
                <div className="b-counter b-counter--front">
                  <span className="b-counter__stripe" />
                </div>
                <div className="b-counter b-counter--side" />

                {/* Brand totem by the aisle */}
                <div className="b-totem b-totem--top" />
                <div className="b-totem b-totem--front">
                  <span className="b-totem__mark" />
                </div>
                <div className="b-totem b-totem--side" />

                {/* Rigging, flown in, with three lamps */}
                <div className="b-rig">
                  <div className="b-beam b-beam--x" />
                  <div className="b-beam b-beam--y" />
                  <span className="b-lamp b-lamp--1" />
                  <span className="b-lamp b-lamp--2" />
                  <span className="b-lamp b-lamp--3" />
                </div>

                {/* Light falling from each lamp: two crossed planes make a beam with volume */}
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`b-ray b-ray--${n}`}>
                    <span className="b-ray__y" />
                    <span className="b-ray__x" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
