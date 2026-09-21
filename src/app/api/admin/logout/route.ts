import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_USER_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  response.cookies.delete(ADMIN_USER_COOKIE);
  return response;
}
