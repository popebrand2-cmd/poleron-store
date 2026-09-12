import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const putSchema = z.object({
  heroImageUrl: z.string().optional(),
  heroEyebrow: z.string().min(1).optional(),
  heroHeadline: z.string().min(1).optional(),
  heroSubtext: z.string().min(1).optional(),
  heroCta: z.string().min(1).optional(),
  heroImageAlign: z.enum(["left", "right"]).optional(),
  accentColor: z.string().optional(),
  heroImagePosX: z.number().min(0).max(100).optional(),
  heroImagePosY: z.number().min(0).max(100).optional(),
  heroImageZoom: z.number().min(1).max(2).optional(),
});

export async function GET() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    heroImageUrl: settings?.heroImageUrl ?? "",
    heroEyebrow: settings?.heroEyebrow ?? "",
    heroHeadline: settings?.heroHeadline ?? "",
    heroSubtext: settings?.heroSubtext ?? "",
    heroCta: settings?.heroCta ?? "",
    heroImageAlign: settings?.heroImageAlign ?? "right",
    accentColor: settings?.accentColor ?? "",
    heroImagePosX: settings?.heroImagePosX ?? 50,
    heroImagePosY: settings?.heroImagePosY ?? 50,
    heroImageZoom: settings?.heroImageZoom ?? 1,
  });
}

export async function PUT(request: Request) {
  const json = await request.json();
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
