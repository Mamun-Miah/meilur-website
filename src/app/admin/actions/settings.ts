"use server";

import { revalidatePath } from "next/cache";
import { bool, done, fail, revalidatePublic, safeAction, str, zodErrors, type ActionState } from "@/lib/action";
import { logActivity } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { THEME_LABELS } from "@/lib/constants";
import { getSettings } from "@/lib/content";
import { db } from "@/lib/db";
import { isTheme, settingsSchema, type SiteSettingsData } from "@/lib/settings";
import { storeImage } from "@/lib/storage";

async function persist(userId: string, email: string, data: SiteSettingsData, theme?: string) {
  await db.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, data: JSON.stringify(data), theme: theme ?? "heritage", updatedBy: email },
    update: { data: JSON.stringify(data), ...(theme ? { theme } : {}), updatedBy: email },
  });
  revalidatePublic();
  revalidatePath("/admin/settings");
}

export const publishTheme = safeAction(async (_prev: ActionState, form: FormData) => {
  const user = await assertUser("ADMIN");
  const theme = str(form, "theme");
  if (!isTheme(theme)) return fail("Choose one of the two themes.");
  const current = await getSettings();
  const { theme: _t, updatedAt: _u, ...data } = current;
  await persist(user.id, user.email, data, theme);
  await logActivity(user.id, "settings.theme", "settings", "1", `Published the ${THEME_LABELS[theme]} theme`);
  return done(`${THEME_LABELS[theme]} is now live on the website.`);
});

/** Saves one group of settings (hero, contact, …), validating the whole document before writing. */
export const saveSettingsGroup = safeAction(async (group: keyof SiteSettingsData, _prev: ActionState, form: FormData) => {
  const user = await assertUser("ADMIN");
  const current = await getSettings();
  const { theme: _t, updatedAt: _u, ...data } = current;
  const next: SiteSettingsData = structuredClone(data);

  // Image fields can be replaced by an upload.
  const uploads: Record<string, [string, string]> = {
    brand: ["logoFile", "logoUrl"],
    hero: ["imageFile", "imageUrl"],
    sections: ["aboutImageFile", "aboutImageUrl"],
    seo: ["ogImageFile", "ogImageUrl"],
  };

  switch (group) {
    case "brand":
      next.brand = { logoUrl: str(form, "logoUrl"), logoAlt: str(form, "logoAlt") };
      break;
    case "hero":
      next.hero = {
        headline: str(form, "headline").replace(/\r\n/g, "\n"),
        lede: str(form, "lede"),
        primaryLabel: str(form, "primaryLabel"),
        primaryHref: str(form, "primaryHref"),
        secondaryLabel: str(form, "secondaryLabel"),
        secondaryHref: str(form, "secondaryHref"),
        imageUrl: str(form, "imageUrl"),
        imageAlt: str(form, "imageAlt"),
        imageCaption: str(form, "imageCaption"),
      };
      break;
    case "sections":
      next.sections = {
        servicesHeading: str(form, "servicesHeading"),
        servicesIntro: str(form, "servicesIntro"),
        aboutHeading: str(form, "aboutHeading"),
        aboutBody: str(form, "aboutBody").replace(/\r\n/g, "\n"),
        strengths: [0, 1, 2, 3, 4, 5].map((i) => str(form, `strength${i}`).trim()).filter(Boolean),
        process: [0, 1, 2, 3, 4, 5]
          .map((i) => ({ title: str(form, `processTitle${i}`).trim(), text: str(form, `processText${i}`).trim() }))
          .filter((s) => s.title),
        aboutImageUrl: str(form, "aboutImageUrl"),
        aboutImageAlt: str(form, "aboutImageAlt"),
        teamHeading: str(form, "teamHeading"),
        teamIntro: str(form, "teamIntro"),
        workHeading: str(form, "workHeading"),
        workIntro: str(form, "workIntro"),
        contactHeading: str(form, "contactHeading"),
        contactIntro: str(form, "contactIntro"),
      };
      break;
    case "contact":
      next.contact = {
        email: str(form, "email"),
        phone: str(form, "phone"),
        address: str(form, "address"),
        linkedinUrl: str(form, "linkedinUrl"),
        facebookUrl: str(form, "facebookUrl"),
        instagramUrl: str(form, "instagramUrl"),
        notifyEmail: str(form, "notifyEmail"),
      };
      next.floating = {
        enabled: bool(form, "floatingEnabled"),
        email: bool(form, "floatingEmail"),
        phone: bool(form, "floatingPhone"),
        linkedin: bool(form, "floatingLinkedin"),
      };
      break;
    case "footer":
      next.footer = { tagline: str(form, "tagline"), note: str(form, "note") };
      break;
    case "seo":
      next.seo = { title: str(form, "title"), description: str(form, "description"), ogImageUrl: str(form, "ogImageUrl") };
      break;
    default:
      return fail("Unknown settings group.");
  }

  const upload = uploads[group];
  if (upload) {
    const file = form.get(upload[0]);
    if (file instanceof File && file.size > 0) {
      const stored = await storeImage(file, "site");
      (next[group] as Record<string, unknown>)[upload[1]] = stored.url;
    }
  }

  const parsed = settingsSchema.safeParse(next);
  if (!parsed.success) {
    const errors = zodErrors(parsed.error);
    // Field names in the form are the last path segment ("hero.headline" -> "headline").
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(errors)) {
      const parts = k.split(".");
      const leaf = parts[1] === "process" ? `process${parts[3] === "title" ? "Title" : "Text"}${parts[2]}` : parts[1] === "strengths" ? `strength${parts[2]}` : parts[parts.length - 1];
      flat[leaf] = v;
    }
    return fail("Nothing was saved. Please fix the highlighted fields.", flat);
  }

  await persist(user.id, user.email, parsed.data);
  await logActivity(user.id, `settings.${group}`, "settings", "1", `Updated ${group} settings`);
  return done("Saved. The live website now shows this change.");
});
