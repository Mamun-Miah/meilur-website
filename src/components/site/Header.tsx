"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { NAV } from "./nav";


type Props = { logoUrl: string; logoAlt: string; ctaLabel: string; ctaHref: string };

export function Header({ logoUrl, logoAlt, ctaLabel, ctaHref }: Props) {
  const [compact, setCompact] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("home");
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Compact past the top; step aside while reading down, return on any upward scroll.
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        setCompact(y > 24);
        if (Math.abs(y - last) > 6) setTucked(y > last && y > 480);
        last = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Active section: the last section whose top has passed a line 35% down the viewport.
  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header" data-compact={compact} data-tucked={tucked && !open}>
      <div className="container site-header__bar">
        <a className="site-header__brand" href="#home" aria-label={`${logoAlt}, back to the top`}>
          <Logo src={logoUrl} label={logoAlt} />
        </a>
        <nav aria-label="Sections">
          <ul className="nav-links">
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} aria-current={active === n.id ? "true" : undefined}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a className="btn site-header__cta" href={ctaHref}>
          {ctaLabel}
        </a>
        <button
          ref={toggleRef}
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <div id="mobile-menu" className="mobile-menu container" data-open={open}>
        <nav aria-label="Sections, mobile">
          <ul>
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} aria-current={active === n.id ? "true" : undefined} onClick={() => setOpen(false)}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <a className="btn" href={ctaHref} onClick={() => setOpen(false)}>
            {ctaLabel}
          </a>
        </nav>
      </div>
    </header>
  );
}
