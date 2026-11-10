import { NextResponse } from "next/server";
import { enquirySchema, fieldErrors } from "@/lib/enquiry-schema";
import { createEnquiry } from "@/lib/enquiries";
import { rateLimit } from "@/lib/rate-limit";
import { clientKey, isSameOrigin, userAgent } from "@/lib/request";

export const runtime = "nodejs";

const MIN_FILL_MS = 2500;

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ message: "Requests must come from the website." }, { status: 403 });
  }
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ message: "Unsupported request." }, { status: 415 });
  }
  const raw = await req.text();
  if (raw.length > 20_000) return NextResponse.json({ message: "That enquiry is too large." }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: "Malformed request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Malformed request." }, { status: 400 });
  }

  const ip = await clientKey();
  if (!(await rateLimit(`enquiry:${ip}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json(
      { message: "Too many enquiries from this connection. Please wait an hour, or email us directly." },
      { status: 429 },
    );
  }

  // Bots: the hidden field is filled, or the form was submitted faster than a person can type.
  // They get a success-shaped reply so they learn nothing, and nothing is stored.
  const honeypot = typeof body.website === "string" && body.website.trim() !== "";
  const tooFast = typeof body.elapsedMs !== "number" || body.elapsedMs < MIN_FILL_MS;
  if (honeypot || tooFast) {
    return NextResponse.json({ message: "Thank you. Your enquiry has reached our team." }, { status: 202 });
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) }, { status: 422 });
  }

  try {
    const result = await createEnquiry(parsed.data, await userAgent());
    if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });
    return NextResponse.json(
      {
        message: result.duplicate
          ? "We already have this enquiry and will reply soon. There is no need to send it again."
          : `Thank you. Your enquiry has reached our team and we will reply to ${parsed.data.email}.`,
      },
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error) {
    console.error("[enquiry] failed to store", error);
    return NextResponse.json(
      { message: "We could not save your enquiry. Please try again in a moment, or email us directly." },
      { status: 500 },
    );
  }
}
