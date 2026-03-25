import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseProjectRef, serverEnv } from "@/lib/env/server";

const DASHBOARD_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const hasSession = hasSupabaseSessionCookie(request);

  // Optimistic protection only for private route prefixes.
  // We intentionally do NOT redirect auth pages when cookies exist,
  // because stale auth cookies can otherwise cause redirect loops.
  if (!hasSession && (pathname.startsWith(DASHBOARD_PREFIX) || pathname.startsWith(ADMIN_PREFIX))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  const projectRef = getSupabaseProjectRef(serverEnv.NEXT_PUBLIC_SUPABASE_URL);

  if (!projectRef) {
    return false;
  }

  const cookiePrefix = `sb-${projectRef}-auth-token`;
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith(cookiePrefix));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
