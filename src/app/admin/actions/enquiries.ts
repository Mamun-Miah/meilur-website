"use server";

import { revalidatePath } from "next/cache";
import { done, fail, safeAction, str, type ActionState } from "@/lib/action";
import { logActivity } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { ENQUIRY_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { statusLabel } from "@/lib/enquiries";

export const updateEnquiry = safeAction(async (id: string, _prev: ActionState, form: FormData) => {
  const user = await assertUser();
  const status = str(form, "status");
  const assigneeId = str(form, "assigneeId") || null;
  if (!(ENQUIRY_STATUSES as readonly string[]).includes(status)) return fail("Choose a status.", { status: "Choose a status." });

  const enquiry = await db.enquiry.findUnique({ where: { id }, include: { assignee: { select: { name: true } } } });
  if (!enquiry) return fail("This enquiry no longer exists.");
  let assigneeName: string | null = null;
  if (assigneeId) {
    const assignee = await db.user.findFirst({ where: { id: assigneeId, active: true }, select: { name: true } });
    if (!assignee) return fail("That team member cannot be assigned.", { assigneeId: "Choose an active team member." });
    assigneeName = assignee.name;
  }

  const changes: string[] = [];
  if (status !== enquiry.status) changes.push(`status ${statusLabel(enquiry.status)} to ${statusLabel(status)}`);
  if (assigneeId !== enquiry.assigneeId) changes.push(assigneeName ? `assigned to ${assigneeName}` : "unassigned");
  if (changes.length === 0) return done("No changes to save.");

  await db.enquiry.update({ where: { id }, data: { status, assigneeId } });
  await logActivity(user.id, "enquiry.update", "enquiry", id, `Enquiry from ${enquiry.name}: ${changes.join(", ")}`);
  revalidatePath(`/admin/enquiries/${id}`);
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
  return done("Enquiry updated.");
});

export const addNote = safeAction(async (enquiryId: string, _prev: ActionState, form: FormData) => {
  const user = await assertUser();
  const body = str(form, "body").trim();
  if (body.length < 2) return fail("Write a note first.", { body: "Write a note first." });
  if (body.length > 4000) return fail("Keep notes under 4,000 characters.", { body: "Too long." });
  const enquiry = await db.enquiry.findUnique({ where: { id: enquiryId }, select: { id: true, name: true } });
  if (!enquiry) return fail("This enquiry no longer exists.");
  await db.enquiryNote.create({ data: { enquiryId, authorId: user.id, body } });
  await db.enquiry.update({ where: { id: enquiryId }, data: { updatedAt: new Date() } });
  await logActivity(user.id, "enquiry.note", "enquiry", enquiryId, `Added an internal note to the enquiry from ${enquiry.name}`);
  revalidatePath(`/admin/enquiries/${enquiryId}`);
  return done("Note added.");
});

export const editNote = safeAction(async (noteId: string, _prev: ActionState, form: FormData) => {
  const user = await assertUser();
  const body = str(form, "body").trim();
  if (body.length < 2 || body.length > 4000) return fail("Notes must be 2 to 4,000 characters.", { body: "Check the length." });
  const note = await db.enquiryNote.findUnique({ where: { id: noteId } });
  if (!note) return fail("This note no longer exists.");
  // Authors edit their own notes; admins can edit any note.
  if (note.authorId !== user.id && user.role !== "ADMIN") return fail("Only the author or an admin can edit this note.");
  await db.enquiryNote.update({ where: { id: noteId }, data: { body } });
  await logActivity(user.id, "enquiry.note-edit", "enquiry", note.enquiryId, "Edited an internal note");
  revalidatePath(`/admin/enquiries/${note.enquiryId}`);
  return done("Note saved.");
});
