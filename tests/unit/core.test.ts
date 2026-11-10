import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { enquirySchema } from "@/lib/enquiry-schema";
import { reorder } from "@/lib/reorder";
import { DEFAULT_SETTINGS, mergeSettings, settingsSchema, telHref } from "@/lib/settings";
import { slugify } from "@/lib/slug";
import { passwordProblem } from "@/lib/password";

describe("CSV export safety", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell("+8801719383114")).toBe(`"'+8801719383114"`);
    expect(csvCell("-1")).toBe(`"'-1"`);
    expect(csvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvCell("\tcmd")).toBe(`"'\tcmd"`);
  });
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('He said "hi", then\nleft')).toBe('"He said ""hi"", then\nleft"');
    expect(csvCell(null)).toBe('""');
  });
  it("writes a BOM and CRLF rows", () => {
    const out = toCsv([["a", "b"], ["1", "2"]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toContain('"a","b"\r\n"1","2"\r\n');
  });
});

describe("enquiry validation", () => {
  const valid = {
    name: "Rahim Uddin",
    email: "Rahim@Example.com",
    phone: "+880 1711 000000",
    eventType: "Exhibition or trade show",
    eventDate: "",
    venue: "ICCB, Dhaka",
    scale: "",
    message: "We need a 36 square metre stand for a pharma expo in March.",
  };
  it("accepts a complete enquiry and lower-cases the email", () => {
    const r = enquirySchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("rahim@example.com");
  });
  it("rejects malformed input", () => {
    expect(enquirySchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, phone: "call me" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, eventType: "Wedding<script>" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, message: "short" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, eventDate: "2001-01-01" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, message: "x".repeat(4001) }).success).toBe(false);
  });
});

describe("settings", () => {
  it("defaults validate and carry the profile contact details", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
    expect(DEFAULT_SETTINGS.contact.email).toBe("info.meilleurevents@gmail.com");
    expect(DEFAULT_SETTINGS.contact.linkedinUrl).toBe("");
  });
  it("merges stored values over defaults and falls back on invalid data", () => {
    const merged = mergeSettings({ contact: { phone: "+880 1999 999999" } });
    expect(merged.contact.phone).toBe("+880 1999 999999");
    expect(merged.contact.email).toBe(DEFAULT_SETTINGS.contact.email);
    expect(mergeSettings({ contact: { email: "not-an-email" } })).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings("garbage")).toEqual(DEFAULT_SETTINGS);
  });
  it("rejects unsafe link targets", () => {
    const bad = structuredClone(DEFAULT_SETTINGS);
    bad.hero.primaryHref = "javascript:alert(1)";
    expect(settingsSchema.safeParse(bad).success).toBe(false);
    const bad2 = structuredClone(DEFAULT_SETTINGS);
    bad2.contact.linkedinUrl = "http://linkedin.com/company/x";
    expect(settingsSchema.safeParse(bad2).success).toBe(false);
  });
  it("builds tel: links from formatted numbers", () => {
    expect(telHref("+880 1719 383114")).toBe("tel:+8801719383114");
  });
});

describe("helpers", () => {
  it("slugifies titles", () => {
    expect(slugify("Hajj & Umrah Fair 2025")).toBe("hajj-and-umrah-fair-2025");
    expect(slugify("BRAC Freshers' Orientation")).toBe("brac-freshers-orientation");
    expect(slugify("!!!")).toBe("item");
  });
  it("reorders and heals sort orders", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(reorder(items, "c", "up")).toEqual([
      { id: "a", sortOrder: 0 },
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
    expect(reorder(items, "a", "up").map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(reorder(items, "zzz", "down")).toEqual([]);
  });
  it("enforces the password rule", () => {
    expect(passwordProblem("short1")).not.toBeNull();
    expect(passwordProblem("longpasswordnodigits")).not.toBeNull();
    expect(passwordProblem("a-good-pass-2026")).toBeNull();
  });
});
