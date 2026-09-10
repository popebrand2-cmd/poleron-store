import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const viewSchema = z.object({
  label: z.string().min(1),
  imageUrl: z.string().min(1),
  allowRotate: z.boolean(),
  zoneXPct: z.number().min(0).max(100),
  zoneYPct: z.number().min(0).max(100),
  zoneWidthPct: z.number().min(1).max(100),
  zoneHeightPct: z.number().min(1).max(100),
});

const colorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().min(1),
  views: z.array(viewSchema).min(1),
});

const sizeSchema = z.object({
  label: z.string().min(1),
  priceDelta: z.number(),
});

const productSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  description: z.string(),
  basePrice: z.number().int().min(0),
  active: z.boolean(),
  sizes: z.array(sizeSchema).min(1),
  colors: z.array(colorSchema).min(1),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json();
  const parsed = productSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const data = parsed.data;

  const conflict = await prisma.product.findFirst({ where: { slug: data.slug, NOT: { id } } });
  if (conflict) {
    return NextResponse.json({ error: "Ya existe otro producto con ese slug." }, { status: 409 });
  }

  // Replace colors/sizes wholesale — simplest way to keep zones/views consistent
  // with whatever the admin edited in the form, without diffing nested arrays.
  await prisma.$transaction([
    prisma.productColor.deleteMany({ where: { productId: id } }),
    prisma.productSize.deleteMany({ where: { productId: id } }),
    prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        basePrice: data.basePrice,
        active: data.active,
        sizes: {
          create: data.sizes.map((s, i) => ({ label: s.label, priceDelta: s.priceDelta, sortOrder: i })),
        },
        colors: {
          create: data.colors.map((c, i) => ({
            name: c.name,
            hex: c.hex,
            sortOrder: i,
            views: { create: c.views.map((v, j) => ({ ...v, sortOrder: j })) },
          })),
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
