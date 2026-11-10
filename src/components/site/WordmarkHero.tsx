"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { typeset } from "@/lib/typeset";

type Props = {
  headline: string;
  lede: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  photo: { src: string; alt: string; caption: string };
  brand: string;
  surface: string;
};

/**
 * The hero: the company's own hand-lettered wordmark, set across the page and
 * cut out so a real MEILLEUR stand shows through the letters. The letters
 * wipe open on load; as the visitor scrolls, the photograph drifts inside them.
 */
export function WordmarkHero({ headline, lede, primary, secondary, photo, brand, surface }: Props) {
  const ref = useRef<HTMLElement>(null);
  const lines = headline.split("\n").filter(Boolean);

  useEffect(() => {
    const el = ref.current;
    if (!el || !document.documentElement.classList.contains("motion")) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
      el.style.setProperty("--hp", p.toFixed(4));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    document.addEventListener("scroll", request, { passive: true, capture: true });
    update();
    return () => {
      document.removeEventListener("scroll", request, { capture: true });
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={ref} id="home" className="wm-hero" data-surface={surface} aria-labelledby="hero-title">
      <div className="container">
        <figure className="wm-hero__mark">
          <div className="wm-hero__letters" role="img" aria-label={`${brand}, the letters filled with a photograph: ${photo.alt}`}>
            {photo.src ? (
              <div className="wm-hero__pan">
                <Image src={photo.src} alt="" fill priority sizes="(max-width: 1440px) 100vw, 1440px" />
              </div>
            ) : null}
          </div>
        </figure>

        <div className="wm-hero__body">
          <h1 id="hero-title">
            {lines.map((line, i) => (
              <span key={i} className="line">
                <span className="line__inner" style={{ ["--i" as string]: i }}>
                  {typeset(line)}
                </span>
              </span>
            ))}
          </h1>
          <div className="wm-hero__side">
            <p className="wm-hero__lede">{lede}</p>
            <div className="wm-hero__actions">
              <a className="btn" href={primary.href}>
                {primary.label}
              </a>
              <a className="btn btn--quiet" href={secondary.href}>
                {secondary.label}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
