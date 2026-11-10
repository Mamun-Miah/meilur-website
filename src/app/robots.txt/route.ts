// A route handler rather than app/robots.ts: Next's metadata loader fails when
// the project path contains an apostrophe, and this output is identical.
export const dynamic = "force-static";

export function GET() {
  const site = process.env.SITE_URL || "http://localhost:3000";
  const body = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /preview", "Disallow: /api", "", `Sitemap: ${site}/sitemap.xml`, ""].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
