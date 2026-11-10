"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { bool, done, fail, revalidatePublic, safeAction, str, zodErrors, type ActionState } from "@/lib/action";
import { logActivity } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reorder } from "@/lib/reorder";
import { slugify } from "@/lib/slug";
import { deleteStoredImage, storeImage } from "@/lib/storage";

/* ---------------- Services ---------------- */

const serviceSchema = z.object({
  title: z.string().trim().min(2, "Give the service a name.").max(80),
  summary: z.string().trim().min(10, "Write one or two sentences.").max(260, "Keep the description under 260 characters."),
  imageAlt: z.string().trim().max(200),
  featured: z.boolean(),
  published: z.boolean(),
});

export const saveService = safeAction(async (id: string | null, _prev: ActionState, form: FormData) => {
  const user = await assertUser();
  const parsed = serviceSchema.safeParse({
    title: str(form, "title"),
    summary: str(form, "summary"),
    imageAlt: str(form, "imageAlt"),
    featured: bool(form, "featured"),
    published: bool(form, "published"),
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodErrors(parsed.error));
  const d = parsed.data;

  const existing = id ? await db.service.findUnique({ where: { id } }) : null;
  if (id && !existing) return fail("This service no longer exists.");

  let image: { imageUrl: string | null } = { imageUrl: existing?.imageUrl ?? null };
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    const stored = await storeImage(file, "services");
    image = { imageUrl: stored.url };
  } else if (bool(form, "removeImage")) {
    image = { imageUrl: null };
  }
  if (d.featured && image.imageUrl && !d.imageAlt) {
    return fail("Describe the image for screen readers.", { imageAlt: "Describe the image." });
  }
  const data = { ...d, imageAlt: d.imageAlt || null, ...image };

  if (existing) {
    await db.service.update({ where: { id: existing.id }, data });
    await logActivity(user.id, "service.update", "service", existing.id, `Updated service "${d.title}"`);
  } else {
    const max = await db.service.aggregate({ _max: { sortOrder: true } });
    let slug = slugify(d.title);
    if (await db.service.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const created = await db.service.create({ data: { ...data, slug, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
    await logActivity(user.id, "service.create", "service", created.id, `Created service "${d.title}"`);
    revalidatePublic();
    redirect("/admin/services?saved=1");
  }
  revalidatePublic();
  revalidatePath("/admin/services");
  return done("Service saved. The website shows the change now.");
});

export const moveService = safeAction(async (id: string, direction: "up" | "down") => {
  await assertUser();
  const items = await db.service.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  await db.$transaction(reorder(items, id, direction).map((o) => db.service.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } })));
  revalidatePublic();
  revalidatePath("/admin/services");
  return done("Order updated.");
});

export const toggleService = safeAction(async (id: string, field: "published" | "featured") => {
  const user = await assertUser();
  const s = await db.service.findUnique({ where: { id } });
  if (!s) return fail("This service no longer exists.");
  const next = !s[field];
  await db.service.update({ where: { id }, data: { [field]: next } });
  await logActivity(user.id, `service.${field}`, "service", id, `${next ? "Set" : "Unset"} ${field} on "${s.title}"`);
  revalidatePublic();
  revalidatePath("/admin/services");
  return done("Saved.");
});

export const deleteService = safeAction(async (id: string) => {
  const user = await assertUser("ADMIN");
  const s = await db.service.findUnique({ where: { id } });
  if (!s) return fail("This service no longer exists.");
  await db.service.delete({ where: { id } });
  await logActivity(user.id, "service.delete", "service", id, `Deleted service "${s.title}"`);
  revalidatePublic();
  redirect("/admin/services?deleted=1");
});

/* ---------------- Team ---------------- */

const linkedin = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/[^\s]+$/i.test(v), "Use the full LinkedIn address, starting https://www.linkedin.com/");

const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name.").max(100),
  jobTitle: z.string().trim().min(2, "Enter the job title.").max(100),
  bio: z.string().trim().max(400, "Keep the biography under 400 characters."),
  photoAlt: z.string().trim().max(200),
  linkedinUrl: linkedin,
  published: z.boolean(),
});

export const saveMember = safeAction(async (id: string | null, _prev: ActionState, form: FormData) => {
  const user = await assertUser();
  const parsed = memberSchema.safeParse({
    name: str(form, "name"),
    jobTitle: str(form, "jobTitle"),
    bio: str(form, "bio"),
    photoAlt: str(form, "photoAlt"),
    linkedinUrl: str(form, "linkedinUrl"),
    published: bool(form, "published"),
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodErrors(parsed.error));
  const d = parsed.data;
  const existing = id ? await db.teamMember.findUnique({ where: { id } }) : null;
  if (id && !existing) return fail("This team member no longer exists.");

  let photoUrl = existing?.photoUrl ?? null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) photoUrl = (await storeImage(file, "team")).url;
  else if (bool(form, "removePhoto")) photoUrl = null;

  const data = { ...d, photoAlt: d.photoAlt || null, linkedinUrl: d.linkedinUrl || null, photoUrl };
  if (existing) {
    await db.teamMember.update({ where: { id: existing.id }, data });
    await logActivity(user.id, "team.update", "team", existing.id, `Updated team member "${d.name}"`);
    revalidatePublic();
    revalidatePath("/admin/team");
    return done("Team member saved.");
  }
  const max = await db.teamMember.aggregate({ _max: { sortOrder: true } });
  const created = await db.teamMember.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  await logActivity(user.id, "team.create", "team", created.id, `Added team member "${d.name}"`);
  revalidatePublic();
  redirect("/admin/team?saved=1");
});

export const moveMember = safeAction(async (id: string, direction: "up" | "down") => {
  await assertUser();
  const items = await db.teamMember.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  await db.$transaction(reorder(items, id, direction).map((o) => db.teamMember.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } })));
  revalidatePublic();
  revalidatePath("/admin/team");
  return done("Order updated.");
});

export const toggleMember = safeAction(async (id: string) => {
  const user = await assertUser();
  const m = await db.teamMember.findUnique({ where: { id } });
  if (!m) return fail("This team member no longer exists.");
  await db.teamMember.update({ where: { id }, data: { published: !m.published } });
  await logActivity(user.id, "team.published", "team", id, `${m.published ? "Hid" : "Published"} "${m.name}"`);
  revalidatePublic();
  revalidatePath("/admin/team");
  return done("Saved.");
});

export const deleteMember = safeAction(async (id: string) => {
  const user = await assertUser("ADMIN");
  const m = await db.teamMember.findUnique({ where: { id } });
  if (!m) return fail("This team member no longer exists.");
  await db.teamMember.delete({ where: { id } });
  if (m.photoUrl?.startsWith("/uploads/")) await deleteStoredImage(`local:${m.photoUrl}`);
  await logActivity(user.id, "team.delete", "team", id, `Removed team member "${m.name}"`);
  revalidatePublic();
  redirect("/admin/team?deleted=1");
});
