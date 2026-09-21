import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_USER_COOKIE,
  REMEMBER_SESSION_SECONDS,
  USER_SESSION_SECONDS,
  adminAuthToken,
  isAdminPasswordCorrect,
  signUserToken,
} from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/password";
import { permsFor } from "@/lib/admin-session";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function POST(request: Request) {
  const { email, password, remember } = (await request.json()) as { email?: string; password?: string; remember?: boolean };
  // "Mantener sesión iniciada": a 30-day session instead of the short default.
  if (!password) return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });

  // No email -> the owner's master password.
  if (!email?.trim()) {
    if (!isAdminPasswordCorrect(password)) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, await adminAuthToken(), {
      ...cookieBase,
      maxAge: remember ? REMEMBER_SESSION_SECONDS : 60 * 60 * 24 * 7,
    });
    response.cookies.delete(ADMIN_USER_COOKIE);
    return response;
  }

  const user = await prisma.adminUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  const seconds = remember ? REMEMBER_SESSION_SECONDS : USER_SESSION_SECONDS;
  const token = await signUserToken(
    {
      id: user.id,
      name: user.name,
      role: user.role === "PARTNER" ? "PARTNER" : "EMPLOYEE",
      perms: permsFor(user.role, user.permissions),
    },
    seconds,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_USER_COOKIE, token, { ...cookieBase, maxAge: seconds });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
