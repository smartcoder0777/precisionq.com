import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN, LEGACY_ADMIN_PATH_PREFIXES } from "@/routes/index";

function legacyAdminDestination(pathname: string): string | null {
  for (const prefix of LEGACY_ADMIN_PATH_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return `${ADMIN}${pathname}`;
    }
  }
  return null;
}

/** Redirect old admin URLs (without `/admin`) so bookmarks still work. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-pathname", pathname);

  if (pathname === "/" || pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.startsWith(ADMIN)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const to = legacyAdminDestination(pathname);
  if (!to) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = to;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
