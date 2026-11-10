import type { ThemeName } from "@/lib/constants";

export type Surface = "paper" | "paper-2" | "paper-3" | "night" | "accent";
type SectionKey = "hero" | "services" | "manifesto" | "build" | "team" | "work" | "index" | "contact" | "footer";

/** Same content, different floor: each theme decides the surface of each section. */
const SURFACES: Record<ThemeName, Record<SectionKey, Surface>> = {
  heritage: { hero: "paper", services: "paper-2", manifesto: "paper", build: "night", team: "paper", work: "night", index: "paper", contact: "paper-3", footer: "paper-2" },
  exhibition: { hero: "night", services: "paper", manifesto: "accent", build: "night", team: "paper-2", work: "night", index: "paper", contact: "paper", footer: "night" },
};

export function surface(theme: ThemeName, key: SectionKey): Surface {
  return SURFACES[theme][key];
}
