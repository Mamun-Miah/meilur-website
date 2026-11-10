// End-to-end checks against a running server (npm run dev, or npm start).
//   BASE_URL=http://localhost:3000 npm run test:e2e
// Uses the real database for setup and cleanup; every record it creates uses
// the e2e.test email domain and is deleted at the end.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ORIGIN = new URL(BASE).origin;
const db = new PrismaClient();
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail && !pass ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (t) => createHash("sha256").update(t).digest("hex");

async function sessionFor(role) {
  const email = `${role.toLowerCase()}-${Date.now()}@e2e.test`;
  const user = await db.user.create({ data: { email, name: `E2E ${role}`, role, passwordHash: await bcrypt.hash(randomBytes(9).toString("hex") + "1a", 4) } });
  const token = randomBytes(32).toString("base64url");
  await db.session.create({ data: { tokenHash: hash(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) } });
  return { user, cookie: `mlr_session=${token}` };
}

const post = (body, headers = {}) =>
  fetch(`${BASE}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, "X-Forwarded-For": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...headers },
    body: JSON.stringify(body),
  });

const stamp = Date.now();
const enquiry = {
  name: "=cmd|' /C calc'!A0",
  email: `client-${stamp}@e2e.test`,
  phone: "+880 1711 000000",
  eventType: "Exhibition or trade show",
  eventDate: "",
  venue: "ICCB Hall 4, Dhaka",
  scale: "100 to 500 guests",
  message: `E2E brief ${stamp}: a 6 by 6 metre stand with a meeting room and storage.`,
  website: "",
  elapsedMs: 9000,
};

try {
  // ---- Public site ----
  const home = await fetch(BASE);
  const html = await home.text();
  check("home page responds 200", home.status === 200, String(home.status));
  for (const id of ["home", "services", "about", "team", "work", "contact"]) {
    check(`section #${id} exists and is linked from the nav`, html.includes(`id="${id}"`) && html.includes(`href="#${id}"`));
  }
  check("contact email from settings is on the page", html.includes("info.meilleurevents@gmail.com"));
  check("telephone uses a tel: link", html.includes('href="tel:+8801719383114"'));
  check("no LinkedIn link is invented", !/linkedin\.com/i.test(html));
  check("canonical and Open Graph metadata present", html.includes('rel="canonical"') && html.includes('property="og:title"'));
  check("theme attribute rendered on the server (no flash)", /class="site" data-theme="(heritage|exhibition)"/.test(html));
  const robots = await fetch(`${BASE}/robots.txt`);
  const robotsText = await robots.text();
  check("robots.txt disallows /admin", robots.status === 200 && robotsText.includes("Disallow: /admin"));
  check("sitemap.xml responds", (await fetch(`${BASE}/sitemap.xml`)).status === 200);
  const img = await fetch(`${BASE}/work/textech-2025/02.jpg`);
  check("project photograph is served", img.status === 200 && (img.headers.get("content-type") || "").includes("image"));

  // ---- Protection ----
  const adminRes = await fetch(`${BASE}/admin`, { redirect: "manual" });
  check("unauthenticated /admin redirects to login", [302, 307, 308].includes(adminRes.status) && (adminRes.headers.get("location") || "").includes("/admin/login"));
  const enqPage = await fetch(`${BASE}/admin/enquiries`, { redirect: "manual" });
  check("unauthenticated /admin/enquiries redirects", [302, 307, 308].includes(enqPage.status));
  const previewRes = await fetch(`${BASE}/preview?theme=exhibition`, { redirect: "manual" });
  check("unauthenticated /preview redirects", [302, 307, 308].includes(previewRes.status));
  const exportAnon = await fetch(`${BASE}/api/admin/enquiries/export`);
  check("unauthenticated CSV export is refused (401)", exportAnon.status === 401, String(exportAnon.status));
  const forged = await fetch(`${BASE}/api/admin/enquiries/export`, { headers: { Cookie: "mlr_session=forged-token" } });
  check("forged session cookie is refused (401)", forged.status === 401, String(forged.status));

  // ---- Enquiry API ----
  const cross = await post(enquiry, { Origin: "https://evil.example" });
  check("cross-site enquiry POST is refused (403)", cross.status === 403, String(cross.status));
  const invalid = await post({ ...enquiry, email: "not-an-email", message: "hi" });
  const invalidJson = await invalid.json();
  check("invalid enquiry rejected by the server (422) with field errors", invalid.status === 422 && invalidJson.errors?.email && invalidJson.errors?.message);
  const malformed = await fetch(`${BASE}/api/enquiries`, { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: "{not json" });
  check("malformed JSON rejected (400)", malformed.status === 400, String(malformed.status));
  const honey = await post({ ...enquiry, website: "http://spam.example", message: `${enquiry.message} honeypot` });
  const fast = await post({ ...enquiry, elapsedMs: 300, message: `${enquiry.message} fast` });
  await sleep(300);
  const botRows = await db.enquiry.count({ where: { email: enquiry.email, message: { contains: "honeypot" } } });
  const fastRows = await db.enquiry.count({ where: { email: enquiry.email, message: { contains: " fast" } } });
  check("honeypot submission is not stored", honey.status === 202 && botRows === 0);
  check("too-fast submission is not stored", fast.status === 202 && fastRows === 0);

  const ok = await post(enquiry);
  const okJson = await ok.json();
  check("valid enquiry accepted (201)", ok.status === 201, `${ok.status} ${JSON.stringify(okJson)}`);
  const stored = await db.enquiry.findFirst({ where: { email: enquiry.email } });
  check("enquiry stored in the database with status NEW", stored?.status === "NEW" && stored.venue === enquiry.venue);
  check("notification attempted and recorded", ["SENT", "SKIPPED", "FAILED"].includes(stored?.notifyState ?? ""), stored?.notifyState);
  check("response leaks no internal fields", !("id" in okJson) && !JSON.stringify(okJson).includes("dedupe"));
  const dup = await post(enquiry);
  const count = await db.enquiry.count({ where: { email: enquiry.email } });
  check("duplicate submission acknowledged without a second record", dup.status === 200 && count === 1, `${dup.status} count=${count}`);

  // ---- Private notes never reach the public site ----
  const secret = `PRIVATE-NOTE-${stamp}`;
  const admin = await sessionFor("ADMIN");
  const editor = await sessionFor("EDITOR");
  await db.enquiryNote.create({ data: { enquiryId: stored.id, authorId: admin.user.id, body: secret } });
  const home2 = await (await fetch(`${BASE}/?n=${stamp}`)).text();
  check("internal notes and enquiry data are absent from the public page", !home2.includes(secret) && !home2.includes(enquiry.email));

  // ---- CSV export permissions and safety ----
  const editorCsv = await fetch(`${BASE}/api/admin/enquiries/export`, { headers: { Cookie: editor.cookie } });
  check("editor cannot export CSV (403)", editorCsv.status === 403, String(editorCsv.status));
  const crossCsv = await fetch(`${BASE}/api/admin/enquiries/export`, { headers: { Cookie: admin.cookie, Origin: "https://evil.example" } });
  check("cross-site CSV request refused (403)", crossCsv.status === 403, String(crossCsv.status));
  const csvRes = await fetch(`${BASE}/api/admin/enquiries/export?q=${encodeURIComponent(enquiry.email)}`, { headers: { Cookie: admin.cookie } });
  const csv = await csvRes.text();
  check("admin CSV export works", csvRes.status === 200 && (csvRes.headers.get("content-type") || "").includes("text/csv"));
  const lines = csv.trim().split("\r\n");
  check("CSV contains only the filtered record", lines.length === 2, `${lines.length} lines`);
  check("CSV neutralises formula injection", csv.includes(`"'=cmd|' /C calc'!A0"`) && csv.includes(`"'+880 1711 000000"`));
  check("CSV never includes internal notes", !csv.includes(secret));
  const statusCsv = await (await fetch(`${BASE}/api/admin/enquiries/export?status=WON&q=${encodeURIComponent(enquiry.email)}`, { headers: { Cookie: admin.cookie } })).text();
  check("CSV respects the status filter", statusCsv.trim().split("\r\n").length === 1);

  // ---- Authenticated pages ----
  const dash = await fetch(`${BASE}/admin`, { headers: { Cookie: admin.cookie }, redirect: "manual" });
  check("admin can open the dashboard", dash.status === 200, String(dash.status));
  const editorSettings = await fetch(`${BASE}/admin/settings`, { headers: { Cookie: editor.cookie }, redirect: "manual" });
  check("editor is turned away from settings", [302, 307, 308].includes(editorSettings.status) || (await editorSettings.text()).includes("admins only"));
  const prev = await fetch(`${BASE}/preview?theme=exhibition`, { headers: { Cookie: admin.cookie } });
  const prevHtml = await prev.text();
  check("signed-in preview renders the requested theme", prev.status === 200 && prevHtml.includes('data-theme="exhibition"') && prevHtml.includes("noindex"));
  const detail = await fetch(`${BASE}/admin/enquiries/${stored.id}`, { headers: { Cookie: admin.cookie } });
  check("staff can read the enquiry with its notes", detail.status === 200 && (await detail.text()).includes(secret));

  // ---- Session expiry ----
  await db.session.updateMany({ where: { userId: editor.user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const expired = await fetch(`${BASE}/api/admin/enquiries/export`, { headers: { Cookie: editor.cookie } });
  check("expired session is refused (401)", expired.status === 401, String(expired.status));
} catch (error) {
  check("e2e run completed without crashing", false, error instanceof Error ? error.stack : String(error));
} finally {
  await db.enquiry.deleteMany({ where: { email: { endsWith: "@e2e.test" } } });
  const users = await db.user.findMany({ where: { email: { endsWith: "@e2e.test" } }, select: { id: true } });
  await db.activityLog.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await db.user.deleteMany({ where: { email: { endsWith: "@e2e.test" } } });
  await db.rateLimit.deleteMany({ where: { key: { startsWith: "enquiry:" } } });
  await db.$disconnect();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}
