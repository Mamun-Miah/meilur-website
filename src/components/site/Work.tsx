"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicProject } from "@/lib/content";
import { useScrollProgress } from "./useScrollProgress";
import { typeset } from "@/lib/typeset";

type Props = { projects: PublicProject[]; heading: string; intro: string; surface: string; indexSurface: string };

const CORRIDOR = 6;

/**
 * Work, in two movements. A corridor: the leading projects pass by
 * sideways as the visitor scrolls, each a stand with its number, name and one
 * photograph. Then the index: every programme as a line of type, with its
 * photograph following the pointer, opening into the full set of pictures.
 */
export function Work({ projects, heading, intro, surface, indexSurface }: Props) {
  const categories = useMemo(() => Array.from(new Set(projects.map((p) => p.category))), [projects]);
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [hovered, setHovered] = useState<PublicProject | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const lead = projects.slice(0, CORRIDOR);
  const visible = useMemo(() => (filter === "all" ? projects : projects.filter((p) => p.category === filter)), [projects, filter]);
  const current = openId ? projects.find((p) => p.id === openId) ?? null : null;

  /* Corridor: vertical scroll moves the track sideways. */
  const corridorRef = useScrollProgress<HTMLDivElement>((p) => {
    const track = trackRef.current;
    const view = viewRef.current;
    const section = track?.closest<HTMLElement>(".corridor");
    if (!track || !view || !section) return;
    const distance = Math.max(0, track.scrollWidth - view.clientWidth);
    track.style.setProperty("--x", `${(-p * distance).toFixed(1)}px`);
    section.style.setProperty("--p", p.toFixed(4));
  });

  /* Keyboard users tabbing into a panel that is off to the side: scroll the page to it. */
  const onPanelFocus = (i: number) => {
    const section = corridorRef.current;
    if (!section || !document.documentElement.classList.contains("motion")) return;
    if (getComputedStyle(section).getPropertyValue("--pinned").trim() !== "1") return;
    const travel = section.offsetHeight - window.innerHeight;
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (travel * i) / Math.max(1, lead.length - 1), behavior: "instant" as ScrollBehavior });
  };

  /* Index: the hovered row's photograph follows the pointer. */
  useEffect(() => {
    const el = previewRef.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (!document.documentElement.classList.contains("motion")) return;
    let tx = 0, ty = 0, x = 0, y = 0, frame = 0;
    const tick = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${((tx - x) * 0.03).toFixed(2)}deg)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX + 24;
      ty = e.clientY - 120;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const open = (id: string, trigger: HTMLElement) => {
    returnFocus.current = trigger;
    setHovered(null);
    setOpenId(id);
    setImageIndex(0);
  };
  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && current && !dialog.open) dialog.showModal();
  }, [current]);

  const step = useCallback(
    (delta: number) => {
      if (!current) return;
      setImageIndex((i) => Math.min(Math.max(i + delta, 0), current.images.length - 1));
    },
    [current],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  const image = current?.images[imageIndex];
  const meta = (p: PublicProject) => [p.category, p.location, p.client].filter(Boolean) as string[];
  const count = (n: number) => `${n} ${n === 1 ? "photograph" : "photographs"}`;

  return (
    <section id="work" aria-labelledby="work-title">
      {/* Movement one: the corridor */}
      <div ref={corridorRef} className="corridor" data-surface={surface} style={{ ["--panels" as string]: lead.length }}>
        <div className="corridor__pin">
          <div ref={viewRef} className="corridor__view">
            <div ref={trackRef} className="corridor__track">
              <div className="corridor__intro">
                <h2 id="work-title">{heading}</h2>
                {intro ? <p>{intro}</p> : null}
              </div>
              {lead.map((p, i) => (
                <article key={p.id} className="booth" style={{ ["--i" as string]: i }}>
                  <span className="booth__num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="booth__frame">
                    {p.cover ? (
                      <Image src={p.cover.url} alt={p.cover.alt} fill sizes="(max-width: 60rem) 85vw, 46vw" loading={i < 2 ? "eager" : "lazy"} />
                    ) : null}
                  </div>
                  <div className="booth__caption">
                    <h3 className="booth__title">{typeset(p.title)}</h3>
                    <p className="booth__meta">
                      {[p.year, p.category].filter(Boolean).join(", ")}
                    </p>
                    <button type="button" className="text-link booth__open" onFocus={() => onPanelFocus(i)} onClick={(e) => open(p.id, e.currentTarget)} aria-haspopup="dialog">
                      View {count(p.images.length)}
                      <span className="visually-hidden"> of {p.title}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="corridor__rail" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>

      {/* Movement two: the index */}
      <div className="section index" data-surface={indexSurface}>
        <div className="container">
          <div className="index__head">
            <h3 className="index__title">Every programme</h3>
            {categories.length > 1 ? (
              <div className="filters" role="group" aria-label="Filter programmes by category">
                <button type="button" className="filter" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                  All
                </button>
                {categories.map((c) => (
                  <button key={c} type="button" className="filter" aria-pressed={filter === c} onClick={() => setFilter(c)}>
                    {c}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <p className="visually-hidden" role="status">
            {`Showing ${visible.length} ${visible.length === 1 ? "programme" : "programmes"}`}
          </p>
          <ol className="index__list" onPointerLeave={() => setHovered(null)}>
            {visible.map((p, i) => (
              <li key={p.id} className="index__row" style={{ ["--i" as string]: i }}>
                <button
                  type="button"
                  className="index__open"
                  aria-haspopup="dialog"
                  onPointerEnter={() => setHovered(p)}
                  onFocus={() => setHovered(null)}
                  onClick={(e) => open(p.id, e.currentTarget)}
                >
                  <span className="index__n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="index__name">{typeset(p.title)}</span>
                  <span className="index__cat">{p.category}</span>
                  <span className="index__year">{p.year ?? ""}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div ref={previewRef} className="index__preview" data-show={hovered ? "true" : "false"} aria-hidden="true">
          {visible.map((p) =>
            p.cover ? (
              <div key={p.id} className="index__preview-img" data-active={hovered?.id === p.id}>
                <Image src={p.cover.url} alt="" fill sizes="360px" />
              </div>
            ) : null,
          )}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-labelledby="lightbox-title"
        onClose={() => {
          setOpenId(null);
          returnFocus.current?.focus();
        }}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {current && image ? (
          <div className="lightbox__inner">
            <div className="lightbox__top">
              <div>
                <h3 id="lightbox-title" className="lightbox__title">
                  {current.title}
                </h3>
                <p className="lightbox__meta">{[current.year, ...meta(current)].filter(Boolean).join(", ")}</p>
                {current.description ? <p className="lightbox__desc">{current.description}</p> : null}
              </div>
              <button type="button" onClick={close} autoFocus>
                Close
              </button>
            </div>
            <div className="lightbox__stage">
              <Image key={image.id} src={image.url} alt={image.alt} width={image.width} height={image.height} sizes="100vw" style={{ maxHeight: "100%" }} />
            </div>
            <div className="lightbox__bottom">
              <p className="lightbox__caption">{image.caption}</p>
              <div className="lightbox__nav">
                <span className="lightbox__count" aria-live="polite">
                  {`Photograph ${imageIndex + 1} of ${current.images.length}`}
                </span>
                <button type="button" onClick={() => step(-1)} disabled={imageIndex === 0}>
                  Previous
                </button>
                <button type="button" onClick={() => step(1)} disabled={imageIndex >= current.images.length - 1}>
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
