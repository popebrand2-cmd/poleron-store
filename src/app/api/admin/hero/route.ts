import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const putSchema = z.object({ heroImageUrl: z.string() });

export async function GET() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ heroImageUrl: settings?.heroImageUrl ?? "" });
}

export async function PUT(request: Request) {
  const json = await request.json();
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", heroImageUrl: parsed.data.heroImageUrl },
    update: { heroImageUrl: parsed.data.heroImageUrl },
  });

  return NextResponse.json({ ok: true });
}
