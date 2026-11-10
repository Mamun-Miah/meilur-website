import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { getHomeContent, getSettings } from "@/lib/content";

// Rendered on every request from the database. Static rendering served one
// stale copy after each admin save (stale-while-revalidate), so an owner
// checking a change could see the old version. Four indexed queries per view
// are cheap at this site's traffic; add a CDN cache if that ever changes.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSettings();
  const image = seo.ogImageUrl || undefined;
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: "MEILLEUR",
      title: seo.title,
      description: seo.description,
      images: image ? [{ url: image }] : undefined,
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: image ? [image] : undefined },
    robots: { index: true, follow: true },
  };
}

export default async function HomePage() {
  const content = await getHomeContent();
  return <SitePage content={content} theme={content.settings.theme} />;
}
