import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const putSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function PUT(request: Request) {
  const json = await request.json();
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  await prisma.siteText.upsert({
    where: { key: parsed.data.key },
    create: parsed.data,
    update: { value: parsed.data.value },
  });

  return NextResponse.json({ ok: true });
}
