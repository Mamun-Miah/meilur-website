"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PublicService } from "@/lib/content";
import { typeset } from "@/lib/typeset";

type Props = { services: PublicService[]; heading: string; intro: string; surface: string };

/* Stand plots on a 4 x 4 hall grid: [column, column span, row, row span]. */
const PLOTS: [number, number, number, number][] = [
  [1, 2, 1, 2], [3, 1, 1, 1], [4, 1, 1, 2], [3, 1, 2, 1], [1, 1, 3, 1],
  [2, 2, 3, 1], [4, 1, 3, 2], [1, 2, 4, 1], [3, 1, 4, 1],
];
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Rolls the letters of a title like a split-flap board until they settle. */
function useFlap(text: string, enabled: boolean) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (!enabled) {
      setOut(text);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const run = (now: number) => {
      const t = (now - start) / 520;
      const settled = Math.floor(t * text.length);
      setOut(
        text
          .split("")
          .map((ch, i) => (i < settled || ch === " " ? ch : GLYPHS[(i * 7 + Math.floor(now / 40)) % GLYPHS.length]))
          .join(""),
      );
      if (t < 1) frame = requestAnimationFrame(run);
      else setOut(text);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [text, enabled]);
  return out;
}

/**
 * Services as a floor plan: every service is a stand on the hall. Choosing a
 * stand flips the directory board beside it, like the signage at an expo.
 */
export function ServicesFloor({ services, heading, intro, surface }: Props) {
  const [index, setIndex] = useState(0);
  const [flap, setFlap] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const plots = services.slice(0, PLOTS.length);
  const rest = services.slice(PLOTS.length);
  const current = services[index];
  const title = useFlap(current?.title ?? "", flap);

  const select = (i: number, focus = false) => {
    setFlap(document.documentElement.classList.contains("motion"));
    setIndex(i);
    if (focus) tabs.current[i]?.focus();
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const last = services.length - 1;
    const map: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: last };
    if (e.key in map) {
      e.preventDefault();
      select((map[e.key] + services.length) % services.length, true);
    }
  };

  if (!current) return <section id="services" aria-label="Services" />;

  const tab = (s: PublicService, i: number, style?: React.CSSProperties) => (
    <button
      key={s.id}
      ref={(el) => {
        tabs.current[i] = el;
      }}
      type="button"
      role="tab"
      id={`svc-tab-${i}`}
      aria-selected={i === index}
      aria-controls="svc-board"
      tabIndex={i === index ? 0 : -1}
      className="stand"
      style={style}
      onClick={() => select(i)}
      onKeyDown={(e) => onKey(e, i)}
    >
      <span className="stand__num">{String(i + 1).padStart(2, "0")}</span>
      <span className="stand__name">{typeset(s.title)}</span>
    </button>
  );

  return (
    <section id="services" className="section floor" data-surface={surface} aria-labelledby="services-title">
      <div className="container">
        <div className="floor__head">
          <h2 id="services-title">{heading}</h2>
          {intro ? <p>{intro}</p> : null}
        </div>

        <div className="floor__layout">
          <div className="hall" role="tablist" aria-label="Services, laid out as stands on a hall plan" aria-orientation="horizontal">
            {plots.map((s, i) => {
              const [c, cs, r, rs] = PLOTS[i];
              return tab(s, i, { ["--c" as string]: c, ["--cs" as string]: cs, ["--r" as string]: r, ["--rs" as string]: rs, ["--d" as string]: i });
            })}
            {rest.length ? <div className="hall__annex">{rest.map((s, j) => tab(s, PLOTS.length + j))}</div> : null}
            <span className="hall__door" aria-hidden="true">
              Entrance
            </span>
          </div>

          <div id="svc-board" className="board" data-surface="night" role="tabpanel" aria-labelledby={`svc-tab-${index}`} aria-live="polite">
            <div className="board__head" aria-hidden="true">
              <span className="board__num">{String(index + 1).padStart(2, "0")}</span>
              <span className="board__of">of {String(services.length).padStart(2, "0")}</span>
            </div>
            <h3 className="board__title">
              <span aria-hidden="true">{typeset(title)}</span>
              <span className="visually-hidden">{current.title}</span>
            </h3>
            <p key={current.id} className="board__text">
              {current.summary}
            </p>
            {current.imageUrl ? (
              <figure key={current.imageUrl} className="board__photo">
                <Image src={current.imageUrl} alt={current.imageAlt ?? ""} fill sizes="(max-width: 68rem) 100vw, 36vw" />
              </figure>
            ) : null}
            <a className="btn board__cta" href="#contact">
              Plan this with us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
