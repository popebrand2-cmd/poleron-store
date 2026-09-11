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
  maxWidthCm: z.number().min(1),
  maxHeightCm: z.number().min(1),
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

const materialSchema = z.object({
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
  materials: z.array(materialSchema).min(1),
  colors: z.array(colorSchema).min(1),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = productSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un producto con ese slug." }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      basePrice: data.basePrice,
      active: data.active,
      sizes: {
        create: data.sizes.map((s, i) => ({ label: s.label, priceDelta: s.priceDelta, sortOrder: i })),
      },
      materials: {
        create: data.materials.map((m, i) => ({ label: m.label, priceDelta: m.priceDelta, sortOrder: i })),
      },
      colors: {
        create: data.colors.map((c, i) => ({
          name: c.name,
          hex: c.hex,
          sortOrder: i,
          views: {
            create: c.views.map((v, j) => ({ ...v, sortOrder: j })),
          },
        })),
      },
    },
  });

  return NextResponse.json({ id: product.id });
}
