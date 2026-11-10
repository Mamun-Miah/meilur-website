import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { requireUser } from "@/lib/auth";
import { THEME_LABELS } from "@/lib/constants";
import { getHomeContent } from "@/lib/content";
import { isTheme } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview | MEILLEUR", robots: { index: false, follow: false } };

/** Signed-in preview of the live content in either theme, before the theme is published. */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  await requireUser();
  const { theme: requested } = await searchParams;
  const content = await getHomeContent();
  const theme = isTheme(requested) ? requested : content.settings.theme;
  const live = theme === content.settings.theme;
  return (
    <SitePage
      content={content}
      theme={theme}
      previewNote={`Preview: ${THEME_LABELS[theme]} theme${live ? " (the live theme)" : ", not published yet"}. Visitors see the live site.`}
    />
  );
}
