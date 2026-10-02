import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const last = await prisma.review.findFirst({ orderBy: { sortOrder: "desc" } });

  const item = await prisma.review.create({
    data: {
      customerName: "Nombre del cliente",
      rating: 5,
      text: "Escribe aquí la reseña real del cliente.",
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ ok: true, item });
}
