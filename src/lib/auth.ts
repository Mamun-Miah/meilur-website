import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_TTL_MS, type Role } from "./constants";
import { hashToken, newToken } from "./tokens";

export type SessionUser = { id: string; email: string; name: string; role: Role };

export async function createSession(userId: string, userAgent: string | null) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, userAgent } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, lastSeenAt: true, user: { select: { id: true, email: true, name: true, role: true, active: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.active) {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  // Sliding expiry, written at most once a minute.
  if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
  }
  const { active: _active, ...user } = session.user;
  return { ...user, role: user.role === "ADMIN" ? "ADMIN" : "EDITOR" };
});

/** For pages: redirects to the login screen when signed out. */
export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (role === "ADMIN" && user.role !== "ADMIN") redirect("/admin?denied=1");
  return user;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "Please sign in again." : "Your role does not allow this action.");
  }
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function assertUser(role?: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401);
  if (role === "ADMIN" && user.role !== "ADMIN") throw new AuthError(403);
  return user;
}
