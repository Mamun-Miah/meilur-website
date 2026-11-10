// Seeds the database with the content of MEILLEUR's business profile:
// the services it lists, the programme-experience projects with their
// photographs, default site settings and (optionally) the first admin user.
// Safe to re-run: existing rows are left untouched.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const db = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const photos = JSON.parse(readFileSync(path.join(here, "photos.json"), "utf8"));

const EXHIBITIONS = "Exhibitions and trade shows";
const CONFERENCES = "Conferences and meetings";
const CEREMONIES = "Ceremonies and cultural events";

// Order, titles and years exactly as the profile prints them. `cover` is the
// photograph index used as the cover; `scene` feeds the alt text.
const projects = [
  { slug: "textech-2025", title: "TEXTECH", year: "2025", category: EXHIBITIONS, cover: 1, featured: true, scene: "exhibition stands in the hall" },
  { slug: "asia-pharma-expo-2025", title: "Asia Pharma Expo", year: "2025", category: EXHIBITIONS, cover: 1, featured: true, scene: "exhibition stands and red carpet aisles" },
  { slug: "hajj-umrah-fair-2025", title: "Hajj & Umrah Fair", year: "2025", category: EXHIBITIONS, cover: 1, featured: true, scene: "white exhibition pavilions" },
  { slug: "expo-paint-coatings-2025", title: "Expo Paint & Coatings", year: "2025", category: EXHIBITIONS, cover: 1, scene: "exhibition stands" },
  { slug: "intex-south-asia-2024", title: "14th INTEX South Asia Bangladesh", year: "2024", category: EXHIBITIONS, cover: 0, scene: "opening ceremony and stands" },
  { slug: "asia-pharma-expo-2024", title: "Asia Pharma Expo", year: "2024", category: EXHIBITIONS, cover: 0, scene: "entrance, seminar hall and stands" },
  { slug: "bangla-medexpo-2023", title: "Bangla MedExpo", year: "2023", category: EXHIBITIONS, cover: 1, scene: "hall entrance and shell-scheme stands" },
  { slug: "asia-pharma-expo-2023", title: "Asia Pharma Expo", year: "2023", category: EXHIBITIONS, cover: 1, scene: "exhibition hall and entrance gate" },
  { slug: "bccci-excursion-2025", title: "BCCCI Excursion", year: "2025", category: CEREMONIES, cover: 1, scene: "stage, backdrop and performance" },
  { slug: "bccci-egm-2025", title: "BCCCI EGM", year: "2025", category: CONFERENCES, cover: 0, scene: "stage and backdrop for the extraordinary general meeting" },
  { slug: "brac-freshers-orientation-2024", title: "BRAC Freshers' Orientation", year: "Summer 2024", category: CEREMONIES, cover: 0, scene: "stage, backdrop and performances" },
  { slug: "brac-summer-cultural-program-2024", title: "BRAC Summer Semester Cultural Program", year: "2024", category: CEREMONIES, cover: 0, scene: "stage and seating for the cultural programme" },
  { slug: "national-youth-conference-2023", title: "National Youth Conference", year: "2023", category: CONFERENCES, cover: 0, scene: "conference stage and exhibition boards" },
  { slug: "new-year-celebration-banani-club-2023", title: "New Year Celebration, Banani Club", year: "2023", category: CEREMONIES, cover: 0, scene: "decorated entrance and lit stage" },
  { slug: "brac-microfinance-arm-meeting-2022", title: "BRAC Microfinance ARM Meeting & Retreat", year: "2022", category: CONFERENCES, cover: 0, scene: "stage and meeting backdrop" },
  { slug: "brac-seminar-on-youth-2021", title: "BRAC Seminar on Youth", year: "2021", category: CONFERENCES, cover: 1, scene: "seminar stage and guests" },
  { slug: "arbocel-product-launch", title: "Arbocel Product Launching Ceremony", year: null, category: CEREMONIES, cover: 0, scene: "launch stage and presentation" },
];

const services = [
  { slug: "exhibitions-trade-shows", title: "Exhibitions and trade shows", featured: true,
    summary: "Booth design and management for a strong presence at international and national trade shows and expos.",
    imageUrl: "/work/asia-pharma-expo-2025/02.jpg", imageAlt: "Exhibition stands along a red carpet aisle at Asia Pharma Expo 2025" },
  { slug: "booth-design-fabrication", title: "Exhibition booth design and fabrication", featured: true,
    summary: "Custom stalls designed to attract attention and highlight your brand, then fabricated and installed on site.",
    imageUrl: "/work/expo-paint-coatings-2025/02.jpg", imageAlt: "A red and white fabricated stand at Expo Paint & Coatings 2025" },
  { slug: "corporate-events-conferences", title: "Corporate events and conferences", featured: true,
    summary: "Planning and execution for corporate conferences, general meetings, seminars and press conferences.",
    imageUrl: "/work/bccci-egm-2025/01.jpg", imageAlt: "Guests on stage in front of the BCCCI extraordinary general meeting backdrop, 2025" },
  { slug: "product-launches-ceremonies", title: "Product launches and ceremonies",
    summary: "Product launches, opening ceremonies and cultural performances, staged and run to schedule." },
  { slug: "event-production-venue", title: "Event production and venue management",
    summary: "Complete coordination of the production, with full setup and logistics management at the venue." },
  { slug: "event-branding-design", title: "Event branding and design",
    summary: "2D and 3D designs for stages, stalls and venues that carry your brand through the event." },
  { slug: "brand-activation-atl-btl", title: "Brand activation and ATL/BTL marketing",
    summary: "Strategic marketing and on-ground activation to raise your brand's visibility." },
  { slug: "guest-registration-logistics", title: "Guest management, registration and logistics",
    summary: "Registration and business-partner coordination, guest management and logistics support." },
  { slug: "gift-item-supply", title: "Gift item supply",
    summary: "Gift and giveaway items sourced and supplied for delegates, guests and partners." },
];

async function main() {
  if (!(await db.siteSettings.findUnique({ where: { id: 1 } }))) {
    await db.siteSettings.create({ data: { id: 1, theme: "heritage", data: "{}" } });
    console.log("settings: created with profile defaults");
  }

  for (const [i, s] of services.entries()) {
    const exists = await db.service.findUnique({ where: { slug: s.slug } });
    if (exists) continue;
    await db.service.create({ data: { ...s, featured: !!s.featured, published: true, sortOrder: i } });
  }
  console.log(`services: ${await db.service.count()}`);

  for (const [i, p] of projects.entries()) {
    if (await db.project.findUnique({ where: { slug: p.slug } })) continue;
    const files = photos[p.slug] ?? [];
    const label = [p.title, p.year].filter(Boolean).join(" ");
    const project = await db.project.create({
      data: {
        slug: p.slug,
        title: p.title,
        year: p.year,
        category: p.category,
        status: "PUBLISHED",
        featured: !!p.featured,
        sortOrder: i,
        images: {
          create: files.map((f, n) => ({
            url: f.file,
            width: f.w,
            height: f.h,
            alt: `${label}: ${p.scene}, photograph ${n + 1} of ${files.length}`,
            sortOrder: n,
          })),
        },
      },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    const cover = project.images[p.cover] ?? project.images[0];
    if (cover) await db.project.update({ where: { id: project.id }, data: { coverImageId: cover.id } });
  }
  console.log(`projects: ${await db.project.count()}, images: ${await db.projectImage.count()}`);

  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const email = ADMIN_EMAIL.trim().toLowerCase();
    if (!(await db.user.findUnique({ where: { email } }))) {
      await db.user.create({
        data: { email, name: ADMIN_NAME || "Administrator", role: "ADMIN", passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) },
      });
      console.log(`admin: created ${email}`);
    }
  } else {
    console.log("admin: ADMIN_EMAIL / ADMIN_PASSWORD not set, skipped (use npm run admin:create)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
