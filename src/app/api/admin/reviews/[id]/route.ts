import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  customerName: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  text: z.string().optional(),
  photoUrl: z.string().optional(),
  productSlug: z.string().optional(),
  verified: z.boolean().optional(),
  reviewDate: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const { reviewDate, ...rest } = parsed.data;
  await prisma.review.update({
    where: { id },
    data: { ...rest, ...(reviewDate ? { reviewDate: new Date(reviewDate) } : {}) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
