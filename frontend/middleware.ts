import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * UX redirect only -- checks whether the session cookie is *present*,
 * not valid. The backend's `get_current_user` dependency (see
 * backend/app/services/user_service.py) is the real security boundary;
 * every protected API route enforces it independently, so a request
 * that skips this middleware entirely still can't read real data.
 */
const SESSION_COOKIE = "session";
const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isPublic && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && hasSession) {
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
