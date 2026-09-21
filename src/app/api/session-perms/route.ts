import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUserToken } from "@/lib/admin-auth";
import { permsFor } from "@/lib/admin-session";

// Called by the middleware (which can't reach the database) to get a team
// member's CURRENT permissions. The signed token is the proof of identity, so
// a caller can only ever read their own record.
export async function GET(request: Request) {
  const session = await verifyUserToken(request.headers.get("x-admin-token") ?? undefined);
  if (!session) return NextResponse.json({ active: false, perms: [] });
  const user = await prisma.adminUser.findUnique({ where: { id: session.id } });
  if (!user || !user.active) return NextResponse.json({ active: false, perms: [] });
  return NextResponse.json({ active: true, perms: permsFor(user.role, user.permissions) });
}
