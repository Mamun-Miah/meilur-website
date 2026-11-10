import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS, type EnquiryStatus } from "./constants";
import type { EnquiryInput } from "./enquiry-schema";
import { sendMail } from "./mailer";
import { getSettings } from "./content";

const DUPLICATE_WINDOW_MS = 1000 * 60 * 30;

export function dedupeHash(input: Pick<EnquiryInput, "email" | "message">) {
  const normal = input.message.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(`${input.email}|${normal}`).digest("hex");
}

export type CreateResult = { ok: true; id: string; duplicate: boolean } | { ok: false; error: string };

/** Stores an enquiry and notifies the configured inbox. Duplicate submissions are acknowledged without a second record. */
export async function createEnquiry(input: EnquiryInput, userAgent: string | null): Promise<CreateResult> {
  const hash = dedupeHash(input);
  const recent = await db.enquiry.findFirst({
    where: { dedupeHash: hash, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
    select: { id: true },
  });
  if (recent) return { ok: true, id: recent.id, duplicate: true };

  const enquiry = await db.enquiry.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      eventType: input.eventType,
      eventDate: input.eventDate || null,
      venue: input.venue,
      scale: input.scale || null,
      message: input.message,
      dedupeHash: hash,
      userAgent,
    },
    select: { id: true },
  });

  const settings = await getSettings();
  const site = process.env.SITE_URL || "http://localhost:3000";
  const state = await sendMail({
    to: settings.contact.notifyEmail,
    replyTo: input.email,
    subject: `New enquiry: ${input.eventType} from ${input.name}`,
    text: [
      `A new enquiry arrived through the MEILLEUR website.`,
      ``,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Telephone: ${input.phone}`,
      `Event type: ${input.eventType}`,
      `Expected date: ${input.eventDate || "not given"}`,
      `Venue or location: ${input.venue}`,
      `Scale: ${input.scale || "not given"}`,
      ``,
      input.message,
      ``,
      `Open it in the admin panel: ${site}/admin/enquiries/${enquiry.id}`,
    ].join("\n"),
  });
  await db.enquiry.update({ where: { id: enquiry.id }, data: { notifyState: state } });

  return { ok: true, id: enquiry.id, duplicate: false };
}

export type EnquiryFilters = {
  q?: string;
  status?: string;
  eventType?: string;
  assignee?: string;
  from?: string;
  to?: string;
  sort?: string;
};

export function parseFilters(params: Record<string, string | string[] | undefined>): EnquiryFilters {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  return {
    q: one("q")?.slice(0, 100),
    status: one("status"),
    eventType: one("eventType"),
    assignee: one("assignee"),
    from: one("from"),
    to: one("to"),
    sort: one("sort"),
  };
}

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function buildWhere(f: EnquiryFilters): Prisma.EnquiryWhereInput {
  const where: Prisma.EnquiryWhereInput = {};
  if (f.q) {
    // SQLite's LIKE is already case-insensitive; Postgres needs mode: "insensitive".
    const match = (process.env.DATABASE_URL ?? "").startsWith("postgres")
      ? ({ contains: f.q, mode: "insensitive" } as unknown as Prisma.StringFilter)
      : { contains: f.q };
    where.OR = [{ name: match }, { email: match }, { phone: match }, { venue: match }, { message: match }];
  }
  if (f.status && (ENQUIRY_STATUSES as readonly string[]).includes(f.status)) where.status = f.status;
  if (f.eventType) where.eventType = f.eventType;
  if (f.assignee === "unassigned") where.assigneeId = null;
  else if (f.assignee) where.assigneeId = f.assignee;
  if (isDate(f.from) || isDate(f.to)) {
    where.createdAt = {
      ...(isDate(f.from) ? { gte: new Date(`${f.from}T00:00:00`) } : {}),
      ...(isDate(f.to) ? { lte: new Date(`${f.to}T23:59:59.999`) } : {}),
    };
  }
  return where;
}

const STATUS_RANK: Record<EnquiryStatus, number> = { NEW: 0, IN_DISCUSSION: 1, CONTACTED: 2, WON: 3, LOST: 4 };

export async function listEnquiries(f: EnquiryFilters, take = 200) {
  const rows = await db.enquiry.findMany({
    where: buildWhere(f),
    orderBy: { createdAt: f.sort === "oldest" ? "asc" : "desc" },
    take,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      eventType: true,
      eventDate: true,
      venue: true,
      scale: true,
      message: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      notifyState: true,
      assignee: { select: { id: true, name: true } },
    },
  });
  if (f.sort === "status") {
    rows.sort((a, b) => (STATUS_RANK[a.status as EnquiryStatus] ?? 9) - (STATUS_RANK[b.status as EnquiryStatus] ?? 9));
  }
  return rows;
}

export function statusLabel(status: string) {
  return ENQUIRY_STATUS_LABELS[status as EnquiryStatus] ?? status;
}
