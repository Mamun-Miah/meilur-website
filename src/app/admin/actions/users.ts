"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { done, fail, safeAction, str, zodErrors, type ActionState } from "@/lib/action";
import { logActivity } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";

const userSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  role: z.enum(ROLES),
  password: z.string().superRefine((v, ctx) => {
    const p = passwordProblem(v);
    if (p) ctx.addIssue({ code: z.ZodIssueCode.custom, message: p });
  }),
});

export const createUser = safeAction(async (_prev: ActionState, form: FormData) => {
  const admin = await assertUser("ADMIN");
  const parsed = userSchema.safeParse({ name: str(form, "name"), email: str(form, "email"), role: str(form, "role"), password: str(form, "password") });
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodErrors(parsed.error));
  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) return fail("An account with that email already exists.", { email: "Already in use." });
  const user = await db.user.create({ data: { name: d.name, email: d.email, role: d.role, passwordHash: await hashPassword(d.password) } });
  await logActivity(admin.id, "user.create", "user", user.id, `Created ${d.role.toLowerCase()} account ${d.email}`);
  revalidatePath("/admin/users");
  return done(`Account created for ${d.email}. Share the temporary password privately; they can change it under Account.`);
});

export const updateUserAccess = safeAction(async (id: string, _prev: ActionState, form: FormData) => {
  const admin = await assertUser("ADMIN");
  const role = str(form, "role");
  const active = str(form, "active") === "on";
  if (!(ROLES as readonly string[]).includes(role)) return fail("Choose a role.");
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return fail("This account no longer exists.");
  if (id === admin.id && (role !== "ADMIN" || !active)) return fail("You cannot remove your own admin access. Ask another admin.");
  if (target.role === "ADMIN" && (role !== "ADMIN" || !active)) {
    const admins = await db.user.count({ where: { role: "ADMIN", active: true } });
    if (admins <= 1) return fail("Keep at least one active admin.");
  }
  await db.user.update({ where: { id }, data: { role, active } });
  if (!active) await db.session.deleteMany({ where: { userId: id } });
  await logActivity(admin.id, "user.access", "user", id, `Set ${target.email} to ${role.toLowerCase()}${active ? "" : ", deactivated"}`);
  revalidatePath("/admin/users");
  return done("Access updated.");
});

export const changeOwnPassword = safeAction(async (_prev: ActionState, form: FormData) => {
  const user = await assertUser();
  const current = str(form, "current");
  const next = str(form, "password");
  const confirm = str(form, "confirm");
  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(current, record.passwordHash))) return fail("Your current password is not correct.", { current: "Not correct." });
  const problem = passwordProblem(next);
  if (problem) return fail(problem, { password: problem });
  if (next !== confirm) return fail("The two new passwords do not match.", { confirm: "Does not match." });
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  // Sign out every other device.
  const sessions = await db.session.findMany({ where: { userId: user.id }, orderBy: { lastSeenAt: "desc" }, select: { id: true } });
  await db.session.deleteMany({ where: { userId: user.id, id: { in: sessions.slice(1).map((s) => s.id) } } });
  await logActivity(user.id, "user.password", "user", user.id, "Changed own password");
  return done("Password changed. Other devices have been signed out.");
});
