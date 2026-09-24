import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const collectionSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  active: z.boolean().default(true),
  category: z.string().trim().max(40).default(""),
});

export async function GET() {
  const collections = await prisma.designCollection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { designs: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ collections });
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = collectionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.designCollection.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una colección con ese slug." }, { status: 409 });
  }

  const count = await prisma.designCollection.count();
  const collection = await prisma.designCollection.create({
    data: { name: data.name, slug: data.slug, active: data.active, category: data.category, sortOrder: count },
  });

  return NextResponse.json({ id: collection.id });
}
