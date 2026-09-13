import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, adminAuthToken } from "@/lib/admin-auth";

const VISITOR_COOKIE = "visitor_id";

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const path = typeof json?.path === "string" ? json.path.slice(0, 200) : "/";

  const cookieStore = await cookies();

  // Don't let the store owner's own logged-in browsing inflate their stats.
  const isAdmin = cookieStore.get(ADMIN_COOKIE_NAME)?.value === (await adminAuthToken());

  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  const response = NextResponse.json({ ok: true });
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
    });
  }

  if (!isAdmin) {
    await prisma.visit.create({ data: { path, visitorId } });
  }
  return response;
}
