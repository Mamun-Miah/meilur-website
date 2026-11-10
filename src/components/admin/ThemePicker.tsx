"use client";

import { useState } from "react";
import { publishTheme } from "@/app/admin/actions/settings";
import { ActionForm, Submit } from "./Form";

type Theme = { value: string; label: string; description: string };

/** Choose a theme, see the real site in it, then publish. Nothing changes for visitors until Publish. */
export function ThemePicker({ themes, live }: { themes: Theme[]; live: string }) {
  const [selected, setSelected] = useState(live);
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  return (
    <ActionForm action={publishTheme} className="grid gap-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Theme</legend>
        {themes.map((t) => (
          <label
            key={t.value}
            className={`a-card flex cursor-pointer gap-3 p-4 ${selected === t.value ? "border-ink outline-2 outline-ink" : ""}`}
          >
            <input type="radio" name="theme" value={t.value} checked={selected === t.value} onChange={() => setSelected(t.value)} className="mt-1 size-4 accent-ink" />
            <span>
              <span className="font-semibold">{t.label}</span>
              {t.value === live ? <span className="a-badge a-badge--ok ml-2">Live now</span> : null}
              <span className="mt-1 block text-sm text-muted">{t.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Preview of the website in this theme</p>
          <div className="flex gap-1" role="group" aria-label="Preview width">
            <button type="button" className={`a-btn a-btn--sm ${width === "desktop" ? "" : "a-btn--quiet"}`} aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>
              Desktop
            </button>
            <button type="button" className={`a-btn a-btn--sm ${width === "mobile" ? "" : "a-btn--quiet"}`} aria-pressed={width === "mobile"} onClick={() => setWidth("mobile")}>
              Mobile
            </button>
            <a className="a-btn a-btn--quiet a-btn--sm" href={`/preview?theme=${selected}`} target="_blank" rel="noopener noreferrer">
              Open full screen
            </a>
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-sunk">
          <iframe
            key={selected}
            title={`Preview of the website in the ${selected} theme`}
            src={`/preview?theme=${selected}`}
            className="mx-auto block h-[560px] w-full border-0 bg-panel"
            style={{ maxWidth: width === "mobile" ? 390 : "100%" }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Submit pendingText="Publishing">{selected === live ? "Keep this theme" : "Publish this theme"}</Submit>
        <p className="text-sm text-muted">Visitors see the change as soon as you publish.</p>
      </div>
    </ActionForm>
  );
}
