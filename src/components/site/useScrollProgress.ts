"use client";

import { useEffect, useRef } from "react";

/**
 * Tracks how far a tall section has been scrolled through (0 at its top
 * reaching the viewport top, 1 when its bottom reaches the viewport bottom)
 * and hands it to `onProgress` once per frame. No layout reads happen outside
 * a frame, and nothing runs while the section is off screen.
 *
 * Under reduced motion, or without the `motion` class on <html>, progress is
 * reported once as 1 so every piece shows its finished state.
 */
export function useScrollProgress<T extends HTMLElement>(onProgress: (p: number) => void) {
  const ref = useRef<T>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const animate = document.documentElement.classList.contains("motion");
    if (!animate) {
      cb.current(1);
      return;
    }
    let frame = 0;
    let visible = true;
    const measure = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      const p = travel > 0 ? -r.top / travel : r.top < window.innerHeight / 2 ? 1 : 0;
      cb.current(Math.min(1, Math.max(0, p)));
    };
    const request = () => {
      if (visible && !frame) frame = requestAnimationFrame(measure);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) request();
    });
    io.observe(el);
    // Capture phase catches scrolling on any scroller; the visual viewport covers mobile browsers.
    document.addEventListener("scroll", request, { passive: true, capture: true });
    window.addEventListener("resize", request);
    window.visualViewport?.addEventListener("scroll", request, { passive: true });
    request();
    return () => {
      io.disconnect();
      document.removeEventListener("scroll", request, { capture: true });
      window.removeEventListener("resize", request);
      window.visualViewport?.removeEventListener("scroll", request);
      cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}

/** Maps overall progress p onto a sub-range [a, b], eased out, clamped to 0..1. */
export function stage(p: number, a: number, b: number) {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return 1 - Math.pow(1 - t, 3);
}
