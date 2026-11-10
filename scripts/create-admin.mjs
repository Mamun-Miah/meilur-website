// Creates an admin (or editor) account, or resets an existing account's password.
//   npm run admin:create -- --email owner@example.com --name "Owner Name" [--role EDITOR]
// The password is read from the ADMIN_PASSWORD environment variable or, when
// that is empty, a strong one is generated and printed once.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => (cur.startsWith("--") ? [...acc, [cur.slice(2), all[i + 1]]] : acc), []),
);
const email = (args.email || "").trim().toLowerCase();
const name = args.name || "Administrator";
const role = args.role === "EDITOR" ? "EDITOR" : "ADMIN";

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- --email you@example.com --name "Your Name" [--role EDITOR]');
  process.exit(1);
}

const generated = !process.env.ADMIN_PASSWORD;
const password = process.env.ADMIN_PASSWORD || randomBytes(12).toString("base64url") + "7a";
if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  console.error("ADMIN_PASSWORD must be at least 10 characters with a letter and a number.");
  process.exit(1);
}

const db = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 12);
const existing = await db.user.findUnique({ where: { email } });
if (existing) {
  await db.user.update({ where: { email }, data: { passwordHash, active: true } });
  await db.session.deleteMany({ where: { userId: existing.id } });
  console.log(`Password reset for ${email}; existing sessions were signed out.`);
} else {
  await db.user.create({ data: { email, name, role, passwordHash } });
  console.log(`Created ${role.toLowerCase()} account ${email}.`);
}
if (generated) console.log(`Temporary password (shown once, change it after signing in): ${password}`);
await db.$disconnect();
