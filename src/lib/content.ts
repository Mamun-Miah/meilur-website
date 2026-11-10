import { db } from "./db";
import { isTheme, mergeSettings, type SiteSettings } from "./settings";

/**
 * Public read model. Every query names its columns explicitly, so internal
 * fields (enquiries, notes, users, drafts) can never reach the public site.
 */

export async function getSettings(): Promise<SiteSettings> {
  const row = await db.siteSettings.findUnique({ where: { id: 1 } });
  let data: unknown = {};
  if (row) {
    try {
      data = JSON.parse(row.data);
    } catch {
      data = {};
    }
  }
  return {
    ...mergeSettings(data),
    theme: row && isTheme(row.theme) ? row.theme : "heritage",
    updatedAt: row?.updatedAt ?? null,
  };
}

export type PublicService = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  imageAlt: string | null;
  featured: boolean;
};

export async function getPublishedServices(): Promise<PublicService[]> {
  return db.service.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, summary: true, imageUrl: true, imageAlt: true, featured: true },
  });
}

export type PublicTeamMember = {
  id: string;
  name: string;
  jobTitle: string;
  bio: string;
  photoUrl: string | null;
  photoAlt: string | null;
  linkedinUrl: string | null;
};

export async function getPublishedTeam(): Promise<PublicTeamMember[]> {
  return db.teamMember.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, jobTitle: true, bio: true, photoUrl: true, photoAlt: true, linkedinUrl: true },
  });
}

export type PublicImage = { id: string; url: string; width: number; height: number; alt: string; caption: string };
export type PublicProject = {
  id: string;
  slug: string;
  title: string;
  year: string | null;
  category: string;
  description: string;
  client: string | null;
  location: string | null;
  featured: boolean;
  cover: PublicImage | null;
  images: PublicImage[];
};

export async function getPublishedProjects(): Promise<PublicProject[]> {
  const rows = await db.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      year: true,
      category: true,
      description: true,
      client: true,
      location: true,
      featured: true,
      coverImageId: true,
      images: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true, width: true, height: true, alt: true, caption: true },
      },
    },
  });
  return rows
    .filter((p) => p.images.length > 0)
    .map(({ coverImageId, ...p }) => {
      const cover = p.images.find((i) => i.id === coverImageId) ?? p.images[0] ?? null;
      const images = cover ? [cover, ...p.images.filter((i) => i.id !== cover.id)] : p.images;
      return { ...p, cover, images };
    });
}

export async function getHomeContent() {
  const [settings, services, team, projects] = await Promise.all([
    getSettings(),
    getPublishedServices(),
    getPublishedTeam(),
    getPublishedProjects(),
  ]);
  return { settings, services, team, projects };
}
