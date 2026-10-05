import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const designSchema = z.object({
  name: z.string().min(1),
  imageUrl: z.string().min(1),
  placement: z.enum(["FRONT", "BACK"]),
  backImageUrl: z.string().default(""),
  showFront: z.boolean().default(true),
  showBack: z.boolean().default(true),
  frontScale: z.number().min(0.1).max(1.5).default(0.6),
  backScale: z.number().min(0.1).max(1.5).default(1),
  origin: z.enum(["", "propio", "encargado", "licencia", "dominio-publico", "sin-confirmar"]).default(""),
  sourceNote: z.string().max(500).default(""),
  garmentColors: z.enum(["", "negro", "blanco"]).default(""),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: collectionId } = await params;
  const json = await request.json();
  const parsed = designSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const data = parsed.data;

  const collection = await prisma.designCollection.findUnique({ where: { id: collectionId } });
  if (!collection) {
    return NextResponse.json({ error: "Colección no encontrada." }, { status: 404 });
  }

  const count = await prisma.presetDesign.count({ where: { collectionId } });
  const design = await prisma.presetDesign.create({
    data: {
      collectionId,
      name: data.name,
      imageUrl: data.imageUrl,
      placement: data.placement,
      backImageUrl: data.backImageUrl,
      showFront: data.showFront,
      showBack: data.showBack,
      frontScale: data.frontScale,
      backScale: data.backScale,
      sortOrder: count,
      origin: data.origin,
      sourceNote: data.sourceNote,
      garmentColors: data.garmentColors,
      // A design whose origin is not confirmed is saved but not published.
      active: data.origin !== "sin-confirmar",
    },
  });

  return NextResponse.json({ id: design.id, active: design.active });
}
