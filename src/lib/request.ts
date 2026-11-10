import { headers } from "next/headers";
import { createHash } from "node:crypto";

/** Client IP from the proxy headers, hashed so it is never stored raw. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function userAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent")?.slice(0, 300) ?? null;
}

/**
 * Same-origin check for route handlers (server actions carry Next's own
 * origin check). Rejects cross-site POSTs and cross-site GETs of private data.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin) {
    // Browsers omit Origin on same-origin top-level GET navigations.
    const site = req.headers.get("sec-fetch-site");
    return req.method === "GET" && (site === null || site === "same-origin" || site === "none");
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
