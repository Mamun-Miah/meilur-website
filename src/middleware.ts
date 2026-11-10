import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ADMIN = ["/admin/login", "/admin/forgot", "/admin/reset"];

/**
 * First line only: bounces requests without a session cookie to the login
 * screen. Every page, action and API route still verifies the session and
 * role against the database itself.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("mlr_session");
  if (pathname.startsWith("/api/admin")) {
    if (!hasSession) return NextResponse.json({ message: "Sign in first." }, { status: 401 });
    return NextResponse.next();
  }
  if (PUBLIC_ADMIN.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/preview"] };
