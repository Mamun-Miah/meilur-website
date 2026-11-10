import { NextResponse } from "next/server";
import { logActivity } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { listEnquiries, parseFilters, statusLabel } from "@/lib/enquiries";
import { isSameOrigin } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CSV of the enquiries matching the current filters. Admins only. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in first." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ message: "Only admins can export enquiries." }, { status: 403 });
  if (!isSameOrigin(req)) return NextResponse.json({ message: "Cross-site request refused." }, { status: 403 });

  const url = new URL(req.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams.entries()));
  const rows = await listEnquiries(filters, 5000);

  const csv = toCsv([
    ["Received", "Name", "Email", "Telephone", "Event type", "Event date", "Venue", "Scale", "Status", "Assigned to", "Brief"],
    ...rows.map((r) => [
      r.createdAt.toISOString(),
      r.name,
      r.email,
      r.phone,
      r.eventType,
      r.eventDate ?? "",
      r.venue,
      r.scale ?? "",
      statusLabel(r.status),
      r.assignee?.name ?? "",
      r.message,
    ]),
  ]);
  await logActivity(user.id, "enquiry.export", "enquiry", null, `Exported ${rows.length} enquiries to CSV`);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="meilleur-enquiries-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
