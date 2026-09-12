import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const designSchema = z.object({
  name: z.string().min(1),
  imageUrl: z.string().min(1),
  placement: z.enum(["FRONT", "BACK"]),
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
      sortOrder: count,
    },
  });

  return NextResponse.json({ id: design.id });
}
