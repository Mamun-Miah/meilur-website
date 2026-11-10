import { z } from "zod";
import { THEMES, type ThemeName } from "./constants";

/** Accepts an in-page anchor, a site path, or an http(s)/mailto/tel URL. */
const href = z
  .string()
  .trim()
  .max(300)
  .refine((v) => /^(#[\w-]+|\/[^\s]*|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[+\d\s()-]+)$/.test(v), {
    message: "Use #section, /path, https://…, mailto: or tel:",
  });

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), { message: "Use a full https:// address, or leave empty" });

const imageRef = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(\/[^\s]+|https:\/\/[^\s]+)$/.test(v), { message: "Use an uploaded image or an https:// address" });

const text = (max: number) => z.string().trim().max(max);
const required = (max: number, label: string) => z.string().trim().min(1, `${label} is required`).max(max);

export const settingsSchema = z.object({
  brand: z.object({
    logoUrl: imageRef,
    logoAlt: required(80, "Logo text"),
  }),
  hero: z.object({
    headline: required(90, "Headline"),
    lede: required(160, "Supporting text"),
    primaryLabel: required(28, "Primary button label"),
    primaryHref: href,
    secondaryLabel: required(28, "Secondary button label"),
    secondaryHref: href,
    imageUrl: imageRef,
    imageAlt: text(160),
    imageCaption: text(80),
  }),
  sections: z.object({
    servicesHeading: required(80, "Services heading"),
    servicesIntro: text(220),
    aboutHeading: required(80, "About heading"),
    aboutBody: required(1200, "About text"),
    strengths: z.array(text(120)).max(6),
    process: z
      .array(z.object({ title: required(24, "Step title"), text: text(140) }))
      .min(2)
      .max(6),
    aboutImageUrl: imageRef,
    aboutImageAlt: text(160),
    teamHeading: required(80, "Team heading"),
    teamIntro: text(260),
    workHeading: required(80, "Work heading"),
    workIntro: text(220),
    contactHeading: required(80, "Contact heading"),
    contactIntro: text(260),
  }),
  contact: z.object({
    email: z.string().trim().email("Enter a valid email address").max(120),
    phone: required(30, "Telephone").refine((v) => /^\+?[\d\s()-]{6,}$/.test(v), "Use digits, spaces and an optional +"),
    address: required(200, "Address"),
    linkedinUrl: optionalUrl,
    facebookUrl: optionalUrl,
    instagramUrl: optionalUrl,
    notifyEmail: z.string().trim().email("Enter a valid notification address").max(120),
  }),
  floating: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    phone: z.boolean(),
    linkedin: z.boolean(),
  }),
  footer: z.object({
    tagline: text(120),
    note: text(240),
  }),
  seo: z.object({
    title: required(70, "SEO title"),
    description: required(170, "SEO description"),
    ogImageUrl: imageRef,
  }),
});

export type SiteSettingsData = z.infer<typeof settingsSchema>;
export type SiteSettings = SiteSettingsData & { theme: ThemeName; updatedAt: Date | null };

/** Defaults are the business profile's own words and facts. */
export const DEFAULT_SETTINGS: SiteSettingsData = {
  brand: { logoUrl: "/brand/meilleur-logo.png", logoAlt: "MEILLEUR" },
  hero: {
    headline: "From empty floor\nto opening night.",
    lede: "Exhibition stands, conferences and launches, planned and built by one Dhaka team.",
    primaryLabel: "Plan your event",
    primaryHref: "#contact",
    secondaryLabel: "See our work",
    secondaryHref: "#work",
    imageUrl: "/work/textech-2025/02.jpg",
    imageAlt: "A white lattice exhibition stand with lit shelving and a red carpet aisle at TEXTECH 2025",
    imageCaption: "TEXTECH 2025",
  },
  sections: {
    servicesHeading: "What we design, build and run",
    servicesIntro: "From a single stall to a full exhibition hall, one team plans, fabricates and runs it.",
    aboutHeading: "A direct way of making events",
    aboutBody:
      "MEILLEUR is an event management company in Dhaka. For corporate conferences, product launches and business exhibitions we manage every detail, from booth design to event production. Our approach is direct and results-driven.",
    // In the order of the tagline they back: your event, your success, our expertise.
    strengths: [
      "Minimum time to understand the project",
      "Control over price competitiveness",
      "A team full of expertise in the event industry",
    ],
    process: [
      { title: "Understand", text: "We read the brief quickly: goals, audience, venue and budget." },
      { title: "Design", text: "2D layouts and 3D visuals of the stand, stage or venue." },
      { title: "Produce", text: "Fabrication, branding, equipment and logistics, coordinated by one team." },
      { title: "Deliver", text: "Installation, guest management and running the day on site." },
    ],
    aboutImageUrl: "/work/hajj-umrah-fair-2025/02.jpg",
    aboutImageAlt: "A carved white exhibition pavilion under construction lighting at the Hajj & Umrah Fair 2025",
    teamHeading: "The people on the floor",
    teamIntro: "A team full of expertise in the event industry, ready to read your brief and run your event.",
    workHeading: "Programme experience",
    workIntro: "Trade shows, conferences, launches and cultural programmes we have produced in Bangladesh.",
    contactHeading: "Let's make your next event matter.",
    contactIntro: "Tell us about the exhibition, conference or launch you are planning. We reply with questions, a plan and a price.",
  },
  contact: {
    email: "info.meilleurevents@gmail.com",
    phone: "+880 1719 383114",
    address: "House 423, Road 30, New DOHS Mohakhali, Dhaka, Bangladesh",
    linkedinUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    notifyEmail: "info.meilleurevents@gmail.com",
  },
  floating: { enabled: true, email: true, phone: true, linkedin: true },
  footer: {
    tagline: "Your event | Your success | Our expertise",
    note: "Event management, exhibition planning and production.",
  },
  seo: {
    title: "MEILLEUR | Exhibition and event production in Dhaka",
    description:
      "MEILLEUR designs and builds exhibition stands and produces corporate conferences, product launches and cultural events in Dhaka, Bangladesh.",
    ogImageUrl: "/work/textech-2025/02.jpg",
  },
};

/** Deep-merge stored JSON over defaults so new fields never arrive empty. */
export function mergeSettings(raw: unknown): SiteSettingsData {
  const stored = (raw && typeof raw === "object" ? raw : {}) as Record<string, Record<string, unknown>>;
  const merged = {} as Record<string, unknown>;
  for (const [group, defaults] of Object.entries(DEFAULT_SETTINGS)) {
    merged[group] = { ...(defaults as object), ...(stored[group] ?? {}) };
  }
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export function isTheme(value: unknown): value is ThemeName {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
