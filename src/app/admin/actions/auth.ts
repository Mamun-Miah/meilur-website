"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { done, fail, type ActionState } from "@/lib/action";
import { logActivity } from "@/lib/audit";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { RESET_TTL_MS } from "@/lib/constants";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";
import { clientKey, userAgent } from "@/lib/request";
import { hashToken, newToken } from "@/lib/tokens";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter the email address of your account."),
  password: z.string().min(1, "Enter your password.").max(200),
});

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return fail("Enter your email and password.");
  const { email, password } = parsed.data;

  const ip = await clientKey();
  const allowedIp = await rateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000);
  const allowedAccount = await rateLimit(`login-acct:${email}`, 8, 15 * 60 * 1000);
  if (!allowedIp || !allowedAccount) {
    return fail("Too many sign-in attempts. Wait 15 minutes, or reset your password.");
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    await burnPasswordCheck(password);
    return fail("That email and password do not match an active account.");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return fail("That email and password do not match an active account.");
  }

  await clearRateLimit(`login-acct:${email}`);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id, await userAgent());
  await logActivity(user.id, "login", "user", user.id, `${user.email} signed in`);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await logActivity(user.id, "logout", "user", user.id, `${user.email} signed out`);
  redirect("/admin/login");
}

export async function requestReset(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const generic = done("If that address belongs to an account, a reset link is on its way. It works for 30 minutes.");
  if (!z.string().email().safeParse(email).success) return fail("Enter a valid email address.");

  const ip = await clientKey();
  if (!(await rateLimit(`reset-ip:${ip}`, 5, 60 * 60 * 1000)) || !(await rateLimit(`reset-acct:${email}`, 3, 60 * 60 * 1000))) {
    return generic;
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) return generic;

  const token = newToken();
  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await db.passwordResetToken.create({
    data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  const site = process.env.SITE_URL || "http://localhost:3000";
  await sendMail({
    to: user.email,
    subject: "Reset your MEILLEUR admin password",
    text: `Someone asked to reset the password for ${user.email}.\n\nOpen this link within 30 minutes to choose a new password:\n${site}/admin/reset?token=${token}\n\nIf you did not ask for this, ignore this email; your password stays the same.`,
  });
  await logActivity(user.id, "password.reset-requested", "user", user.id, `Password reset requested for ${user.email}`);
  return generic;
}

export async function resetPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const problem = passwordProblem(password);
  if (problem) return fail(problem, { password: problem });
  if (password !== confirm) return fail("The two passwords do not match.", { confirm: "The two passwords do not match." });

  const record = token ? await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } }) : null;
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail("This reset link has expired or was already used. Ask for a new one.");
  }
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await logActivity(record.userId, "password.reset", "user", record.userId, "Password reset through emailed link");
  return done("Your password has been changed. Sign in with the new password.");
}
