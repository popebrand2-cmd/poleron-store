import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ICON, type ContentSection } from "@/lib/site-content";

const SECTIONS = ["values", "howItWorks", "trustBadges", "faq"] as const;

const createSchema = z.object({
  section: z.enum(SECTIONS),
  icon: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const { section } = parsed.data;
  const last = await prisma.contentItem.findFirst({ where: { section }, orderBy: { sortOrder: "desc" } });

  const item = await prisma.contentItem.create({
    data: {
      section,
      icon: parsed.data.icon ?? DEFAULT_ICON[section as ContentSection],
      title: parsed.data.title ?? (section === "faq" ? "Nueva pregunta" : "Nuevo ítem"),
      text: parsed.data.text ?? (section === "faq" ? "Escribe la respuesta aquí." : "Escribe el texto aquí."),
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ ok: true, item });
}
