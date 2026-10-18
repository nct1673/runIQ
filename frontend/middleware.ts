import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Page-level gate: a request with no session cookie, or one the backend no
 * longer accepts (expired, signed with an old secret, from another install on
 * the same host -- cookies are shared across localhost ports), is sent to
 * /login and the dead cookie is cleared. The backend's `get_current_user`
 * dependency (see backend/app/services/user_service.py) is still the real
 * security boundary; every protected API route enforces it independently.
 */
const SESSION_COOKIE = "session";
const PUBLIC_PATHS = ["/login"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Does the backend accept this request's session cookie? If the backend
 * can't be reached we can't tell, so fall back to trusting the cookie. */
async function sessionIsValid(request: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    return res.status !== 401;
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const hasCookie = request.cookies.has(SESSION_COOKIE);
  const valid = hasCookie && (await sessionIsValid(request));

  if (!valid) {
    const response = isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
    if (hasCookie) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excludes /api/* too: those are fetch() calls that need the backend's
  // real JSON 401, not an HTML redirect -- get_current_user enforces
  // auth on them independently either way.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
