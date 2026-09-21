import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_USER_COOKIE,
  adminAuthToken,
  canAccess,
  firstAllowedPath,
  sectionForPath,
  verifyUserToken,
  type SectionKey,
} from "@/lib/admin-auth";

// Short-lived per-isolate cache so a burst of admin requests (page + its API
// calls) doesn't hit the database each time.
const permCache = new Map<string, { at: number; active: boolean; perms: SectionKey[] }>();

async function livePerms(request: NextRequest, token: string) {
  const hit = permCache.get(token);
  if (hit && Date.now() - hit.at < 5000) return hit;
  try {
    const res = await fetch(new URL("/api/session-perms", request.nextUrl.origin), { headers: { "x-admin-token": token } });
    const data = (await res.json()) as { active: boolean; perms: SectionKey[] };
    const entry = { at: Date.now(), active: data.active, perms: data.perms };
    permCache.set(token, entry);
    return entry;
  } catch {
    return { at: 0, active: false, perms: [] as SectionKey[] };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/login" || pathname === "/api/admin/logout") {
    return NextResponse.next();
  }

  // The owner (ADMIN_PASSWORD) has access to everything.
  const ownerCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (ownerCookie && ownerCookie === (await adminAuthToken())) {
    return NextResponse.next();
  }

  // Team members: signed token with per-section permissions.
  const userToken = request.cookies.get(ADMIN_USER_COOKIE)?.value;
  const user = await verifyUserToken(userToken);
  const live = user && userToken ? await livePerms(request, userToken) : null;
  if (user && live?.active) {
    const section = sectionForPath(pathname);
    if (section === "owner") return deny(request, pathname, live.perms);
    if (section && !canAccess(live.perms, section)) return deny(request, pathname, live.perms);
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

function deny(request: NextRequest, pathname: string, perms: Parameters<typeof firstAllowedPath>[0]) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No tienes permiso para esto." }, { status: 403 });
  }
  const target = firstAllowedPath(perms);
  if (target === pathname) return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
