import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ id: z.string().min(1), action: z.enum(["first", "up", "down"]) });

// Moves a collection in the order it has on the homepage (the first one is the one shown in front of the carousel).
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const { id, action } = parsed.data;

  const list = await prisma.designCollection.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const from = list.findIndex((c) => c.id === id);
  if (from < 0) return NextResponse.json({ error: "No existe esa colección." }, { status: 404 });
  const to = action === "first" ? 0 : action === "up" ? Math.max(0, from - 1) : Math.min(list.length - 1, from + 1);
  const ids = list.map((c) => c.id);
  ids.splice(to, 0, ids.splice(from, 1)[0]);

  // Renumber everything 0..n-1 (old rows may share the same number).
  await prisma.$transaction(ids.map((cid, i) => prisma.designCollection.update({ where: { id: cid }, data: { sortOrder: i } })));
  return NextResponse.json({ ok: true });
}
