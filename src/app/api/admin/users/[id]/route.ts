import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ALL_SECTION_KEYS } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["PARTNER", "EMPLOYEE"]).optional(),
  permissions: z.array(z.enum(ALL_SECTION_KEYS as [string, ...string[]])).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const { permissions, password, ...rest } = parsed.data;
  await prisma.adminUser.update({
    where: { id },
    data: {
      ...rest,
      ...(permissions ? { permissions: permissions.join(",") } : {}),
      ...(password ? { passwordHash: hashPassword(password) } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
