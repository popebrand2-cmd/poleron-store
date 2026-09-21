import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ALL_SECTION_KEYS } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";

const createSchema = z.object({
  name: z.string().min(1, "Falta el nombre."),
  email: z.string().email("Correo inválido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  role: z.enum(["PARTNER", "EMPLOYEE"]),
  permissions: z.array(z.enum(ALL_SECTION_KEYS as [string, ...string[]])).default([]),
});

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const d = parsed.data;
  const email = d.email.trim().toLowerCase();
  if (await prisma.adminUser.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "Ya existe una persona con ese correo." }, { status: 409 });
  }
  await prisma.adminUser.create({
    data: {
      name: d.name.trim(),
      email,
      passwordHash: hashPassword(d.password),
      role: d.role,
      permissions: d.permissions.join(","),
    },
  });
  return NextResponse.json({ ok: true });
}
