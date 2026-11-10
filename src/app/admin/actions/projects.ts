"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { done, fail, revalidatePublic, safeAction, str, bool, zodErrors, type ActionState } from "@/lib/action";
import { logActivity } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { IMAGE_STATUSES, PROJECT_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { reorder } from "@/lib/reorder";
import { slugify } from "@/lib/slug";
import { deleteStoredImage, storeImage } from "@/lib/storage";
import { revalidatePath } from "next/cache";

const projectSchema = z.object({
  title: z.string().trim().min(2, "Give the project a title.").max(120),
  year: z.string().trim().max(20, "Keep the year short, e.g. 2025 or Summer 2024."),
  category: z.string().trim().min(2, "Choose or type a category.").max(60),
  description: z.string().trim().max(2000, "Keep the description under 2,000 characters."),
  client: z.string().trim().max(120),
  location: z.string().trim().max(120),
  status: z.enum(PROJECT_STATUSES),
  featured: z.boolean(),
});

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = slugify(base);
  for (let n = 2; ; n++) {
    const clash = await db.project.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return slug;
    slug = `${slugify(base)}-${n}`;
  }
}

export const saveProject = safeAction(async (id: string | null, _prev: ActionState, form: FormData) => {
  const user = await assertUser();
  const parsed = projectSchema.safeParse({
    title: str(form, "title"),
    year: str(form, "year"),
    category: str(form, "category"),
    description: str(form, "description"),
    client: str(form, "client"),
    location: str(form, "location"),
    status: str(form, "status") || "DRAFT",
    featured: bool(form, "featured"),
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodErrors(parsed.error));
  const d = parsed.data;
  const data = {
    title: d.title,
    year: d.year || null,
    category: d.category,
    description: d.description,
    client: d.client || null,
    location: d.location || null,
    status: d.status,
    featured: d.featured,
  };

  if (id) {
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) return fail("This project no longer exists.");
    await db.project.update({ where: { id }, data });
    await logActivity(user.id, "project.update", "project", id, `Updated project "${d.title}" (${d.status.toLowerCase()})`);
    revalidatePublic();
    revalidatePath(`/admin/projects/${id}`);
    return done("Project saved.");
  }
  const max = await db.project.aggregate({ _max: { sortOrder: true } });
  const created = await db.project.create({
    data: { ...data, slug: await uniqueSlug(`${d.title} ${d.year}`), sortOrder: (max._max.sortOrder ?? -1) + 1 },
  });
  await logActivity(user.id, "project.create", "project", created.id, `Created project "${d.title}"`);
  revalidatePublic();
  redirect(`/admin/projects/${created.id}?created=1`);
});

export const setProjectStatus = safeAction(async (id: string, status: string) => {
  const user = await assertUser();
  if (!(PROJECT_STATUSES as readonly string[]).includes(status)) return fail("Unknown status.");
  const project = await db.project.update({ where: { id }, data: { status } });
  await logActivity(user.id, "project.status", "project", id, `Set "${project.title}" to ${status.toLowerCase()}`);
  revalidatePublic();
  revalidatePath("/admin/projects");
  return done(`Project ${status.toLowerCase()}.`);
});

export const moveProject = safeAction(async (id: string, direction: "up" | "down") => {
  await assertUser();
  const items = await db.project.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], select: { id: true } });
  await db.$transaction(reorder(items, id, direction).map((o) => db.project.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } })));
  revalidatePublic();
  revalidatePath("/admin/projects");
  return done("Order updated.");
});

export const deleteProject = safeAction(async (id: string) => {
  const user = await assertUser("ADMIN");
  const project = await db.project.findUnique({ where: { id }, include: { images: true } });
  if (!project) return fail("This project no longer exists.");
  await db.project.delete({ where: { id } });
  await Promise.all(project.images.map((i) => deleteStoredImage(i.storageKey)));
  await logActivity(user.id, "project.delete", "project", id, `Deleted project "${project.title}" and ${project.images.length} images`);
  revalidatePublic();
  redirect("/admin/projects?deleted=1");
});

export const uploadProjectImages = safeAction(async (projectId: string, _prev: ActionState, form: FormData) => {
  const user = await assertUser();
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, title: true, slug: true, coverImageId: true } });
  if (!project) return fail("This project no longer exists.");
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return fail("Choose one or more images to upload.", { images: "Choose at least one image." });
  if (files.length > 12) return fail("Upload up to 12 images at a time.", { images: "Upload up to 12 images at a time." });

  const max = await db.projectImage.aggregate({ where: { projectId }, _max: { sortOrder: true } });
  let order = (max._max.sortOrder ?? -1) + 1;
  const failures: string[] = [];
  let firstId: string | null = null;
  for (const file of files) {
    try {
      const stored = await storeImage(file, project.slug);
      const img = await db.projectImage.create({
        data: { projectId, ...stored, alt: `${project.title}, photograph`, sortOrder: order++ },
      });
      firstId ??= img.id;
    } catch (error) {
      failures.push(`${file.name}: ${error instanceof Error ? error.message : "could not be stored"}`);
    }
  }
  if (firstId && !project.coverImageId) await db.project.update({ where: { id: projectId }, data: { coverImageId: firstId } });
  const stored = files.length - failures.length;
  await logActivity(user.id, "image.upload", "project", projectId, `Uploaded ${stored} image(s) to "${project.title}"`);
  revalidatePublic();
  revalidatePath(`/admin/projects/${projectId}`);
  if (failures.length) return fail(`${stored} uploaded, ${failures.length} rejected. ${failures.join(" ")}`);
  return done(`${stored} image${stored === 1 ? "" : "s"} uploaded. Add alt text so every photograph is described.`);
});

const imageSchema = z.object({
  alt: z.string().trim().min(3, "Describe the photograph for screen readers.").max(200),
  caption: z.string().trim().max(200),
  status: z.enum(IMAGE_STATUSES),
});

export const updateImage = safeAction(async (imageId: string, _prev: ActionState, form: FormData) => {
  const user = await assertUser();
  const parsed = imageSchema.safeParse({ alt: str(form, "alt"), caption: str(form, "caption"), status: str(form, "status") || "PUBLISHED" });
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodErrors(parsed.error));
  const image = await db.projectImage.update({ where: { id: imageId }, data: parsed.data });
  await logActivity(user.id, "image.update", "project", image.projectId, `Edited image details (${parsed.data.status.toLowerCase()})`);
  revalidatePublic();
  revalidatePath(`/admin/projects/${image.projectId}`);
  return done("Image saved.");
});

export const setCover = safeAction(async (imageId: string) => {
  const user = await assertUser();
  const image = await db.projectImage.findUnique({ where: { id: imageId } });
  if (!image) return fail("Image not found.");
  await db.project.update({ where: { id: image.projectId }, data: { coverImageId: image.id } });
  if (image.status !== "PUBLISHED") await db.projectImage.update({ where: { id: imageId }, data: { status: "PUBLISHED" } });
  await logActivity(user.id, "image.cover", "project", image.projectId, "Changed cover image");
  revalidatePublic();
  revalidatePath(`/admin/projects/${image.projectId}`);
  return done("Cover image updated.");
});

export const moveImage = safeAction(async (imageId: string, direction: "up" | "down") => {
  await assertUser();
  const image = await db.projectImage.findUnique({ where: { id: imageId } });
  if (!image) return fail("Image not found.");
  const items = await db.projectImage.findMany({ where: { projectId: image.projectId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  await db.$transaction(reorder(items, imageId, direction).map((o) => db.projectImage.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } })));
  revalidatePublic();
  revalidatePath(`/admin/projects/${image.projectId}`);
  return done("Order updated.");
});

export const deleteImage = safeAction(async (imageId: string) => {
  const user = await assertUser("ADMIN");
  const image = await db.projectImage.findUnique({ where: { id: imageId }, include: { project: { select: { coverImageId: true, title: true } } } });
  if (!image) return fail("Image not found.");
  await db.projectImage.delete({ where: { id: imageId } });
  if (image.project.coverImageId === imageId) await db.project.update({ where: { id: image.projectId }, data: { coverImageId: null } });
  await deleteStoredImage(image.storageKey);
  await logActivity(user.id, "image.delete", "project", image.projectId, `Deleted an image from "${image.project.title}"`);
  revalidatePublic();
  revalidatePath(`/admin/projects/${image.projectId}`);
  return done("Image deleted.");
});
