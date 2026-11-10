import { getSettings } from "@/lib/content";

// A route handler rather than app/sitemap.ts (see robots.txt/route.ts).
export const revalidate = 3600;

export async function GET() {
  const site = process.env.SITE_URL || "http://localhost:3000";
  const settings = await getSettings().catch(() => null);
  const lastmod = (settings?.updatedAt ?? new Date()).toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site}/</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
